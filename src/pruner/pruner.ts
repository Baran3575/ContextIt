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
 * Strips the function body of a Python function, leaving only the signature and a pass statement.
 */
export function stripPythonFunctionBody(code: string): string {
  const lines = code.split('\n');
  if (lines.length === 0) return code;
  
  let sigLines: string[] = [];
  let parenCount = 0;
  let foundEnd = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    sigLines.push(line);
    
    for (let char of line) {
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
    }
    
    const cleanLine = line.replace(/#.*$/, '').trim();
    if (parenCount === 0 && cleanLine.endsWith(':')) {
      foundEnd = true;
      break;
    }
  }
  
  if (foundEnd) {
    const match = sigLines[0].match(/^(\s*)/);
    const indent = match ? match[1] : '';
    return sigLines.join('\n') + `\n${indent}    pass`;
  }
  
  return code;
}

/**
 * Calculates the relative Dotted module path for Python imports.
 */
export function getPythonRelativeModule(fromFile: string, toFile: string): string {
  const relativePath = path.relative(path.dirname(fromFile), toFile);
  const ext = path.extname(relativePath);
  const withoutExt = relativePath.slice(0, -ext.length);
  
  const dotted = withoutExt.replace(/\\/g, '/');
  const parts = dotted.split('/');
  let upCount = 1;
  let i = 0;
  while (parts[i] === '..') {
    upCount++;
    i++;
  }
  const remainingParts = parts.slice(i);
  const cleanRemaining = remainingParts.join('.');
  return '.'.repeat(upCount) + cleanRemaining;
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
      const ext = path.extname(filePath);
      let lang = 'typescript';
      if (ext === '.py') lang = 'python';
      else if (ext === '.rs') lang = 'rust';

      output += `## File: \`${relativePath}\`\n`;
      output += `\`\`\`${lang}\n`;

      // 1. Output relevant imports with pruned specifiers
      const relevantImports = fileDeps.imports.filter(imp => {
        if (imp.resolvedPath && result.filesToSymbols[imp.resolvedPath]) {
          return true;
        }
        return false;
      });

      if (relevantImports.length > 0) {
        relevantImports.forEach(imp => {
          const importedNeeded = result.filesToSymbols[imp.resolvedPath];
          const activeSpecifiers = imp.specifiers.filter(spec => neededSymbols.has(spec) || importedNeeded.has(spec));
          
          if (activeSpecifiers.length === 0 && !imp.specifiers.includes('*')) {
            return;
          }

          if (lang === 'typescript') {
            const importRelPath = path.relative(path.dirname(filePath), imp.resolvedPath);
            const formattedPath = importRelPath.startsWith('.') ? importRelPath : './' + importRelPath;
            const cleanPath = formattedPath.replace(/\.(ts|tsx|js|jsx)$/, '');
            
            if (imp.specifiers.includes('*')) {
              output += `import * as ${imp.specifiers[0]} from '${cleanPath}';\n`;
            } else if (imp.specifiers.includes('default')) {
              output += `import ${imp.specifiers[0]} from '${cleanPath}';\n`;
            } else {
              output += `import { ${activeSpecifiers.join(', ')} } from '${cleanPath}';\n`;
            }
          } else if (lang === 'python') {
            const pythonModule = getPythonRelativeModule(filePath, imp.resolvedPath);
            if (imp.specifiers.includes('*')) {
              output += `from ${pythonModule} import *\n`;
            } else {
              output += `from ${pythonModule} import ${activeSpecifiers.join(', ')}\n`;
            }
          } else if (lang === 'rust') {
            if (imp.specifiers.includes('*')) {
              const modName = imp.source.split('::').pop();
              output += `mod ${modName};\n`;
            } else {
              if (activeSpecifiers.length === 1) {
                output += `use ${imp.source}::${activeSpecifiers[0]};\n`;
              } else {
                output += `use ${imp.source}::{${activeSpecifiers.join(', ')}};\n`;
              }
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
            if (lang === 'python') {
              symbolCode = stripPythonFunctionBody(symbolCode);
            } else {
              symbolCode = stripFunctionBody(symbolCode);
            }
          }

          output += `${symbolCode}\n\n`;
        }
      }

      output += '```\n\n';
    }

    return output;
  }
}
