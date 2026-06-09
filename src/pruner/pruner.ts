import * as fs from 'fs';
import * as path from 'path';
import { PrunedContextResult } from '../parser/resolver';
import { SymbolInfo, ImportInfo } from '../parser/tsParser';

export interface PruneOptions {
  mode: 'full' | 'decl';
}

/**
 * Strips the function body of a function signature, leaving only the declaration.
 * e.g., "export function greet(name: string): string { return `Hello ${name}`; }"
 * becomes "export function greet(name: string): string;"
 */
export function stripFunctionBody(code: string): string {
  const trimmed = code.trim();
  // Find the first opening brace '{'
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) {
    return code; // No body found, return as is
  }

  // Get the signature part (before the brace)
  let signature = trimmed.substring(0, firstBrace).trim();
  
  // Clean up trailing arrows if arrow function
  if (signature.endsWith('=>')) {
    signature = signature.slice(0, -2).trim();
  }

  // Ensure it ends with a semicolon
  if (!signature.endsWith(';')) {
    signature += ';';
  }

  return signature;
}

/**
 * Strips single-line comments that are not JSDoc or configuration.
 */
export function stripComments(code: string): string {
  return code
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
        return false;
      }
      return true;
    })
    .join('\n');
}

export class CodePruner {
  /**
   * Prunes the resolved files and returns a single formatted markdown context string.
   */
  public prune(result: PrunedContextResult, options: PruneOptions, entryFile: string): string {
    const absoluteEntry = path.resolve(entryFile);
    let output = '# ContextIt: Compressed Project Context\n\n';
    
    // Sort files: place entry file at the very end to maximize Claude's Prompt Caching
    const filePaths = Object.keys(result.filesToSymbols).sort((a, b) => {
      if (a === absoluteEntry) return 1;
      if (b === absoluteEntry) return -1;
      return a.localeCompare(b);
    });

    for (const filePath of filePaths) {
      const neededSymbols = result.filesToSymbols[filePath];
      const fileDeps = result.parsedFiles[filePath];
      const isEntryFile = filePath === absoluteEntry;

      const relativePath = path.relative(process.cwd(), filePath);
      output += `## File: \`${relativePath}\`\n`;
      output += '```typescript\n';

      // 1. Output relevant imports with pruned specifiers
      const relevantImports = fileDeps.imports.filter(imp => {
        if (imp.resolvedPath && result.filesToSymbols[imp.resolvedPath]) {
          return true;
        }
        return false;
      });

      if (relevantImports.length > 0) {
        relevantImports.forEach(imp => {
          const importRelPath = path.relative(path.dirname(filePath), imp.resolvedPath);
          const formattedPath = importRelPath.startsWith('.') ? importRelPath : './' + importRelPath;
          
          if (imp.specifiers.includes('*')) {
            output += `import * as ${imp.specifiers[0]} from '${formattedPath}';\n`;
          } else if (imp.specifiers.includes('default')) {
            output += `import ${imp.specifiers[0]} from '${formattedPath}';\n`;
          } else {
            // Optimised: Only import specifiers that are actually needed/referenced in the target file
            const importedNeeded = result.filesToSymbols[imp.resolvedPath];
            const activeSpecifiers = imp.specifiers.filter(spec => neededSymbols.has(spec) || importedNeeded.has(spec));
            
            if (activeSpecifiers.length > 0) {
              output += `import { ${activeSpecifiers.join(', ')} } from '${formattedPath.replace(/\.(ts|tsx|js|jsx)$/, '')}';\n`;
            }
          }
        });
        output += '\n';
      }

      // 2. Output symbols
      for (const symbol of fileDeps.symbols) {
        if (neededSymbols.has(symbol.name)) {
          let symbolCode = symbol.code;

          // Optimization: Strip comments
          symbolCode = stripComments(symbolCode);

          // If declaration-only mode, and not the entry file, strip function bodies
          if (options.mode === 'decl' && !isEntryFile && symbol.type === 'function') {
            symbolCode = stripFunctionBody(symbolCode);
          }

          output += `${symbolCode}\n\n`;
        }
      }

      output += '```\n\n';
    }

    return output;
  }
}
