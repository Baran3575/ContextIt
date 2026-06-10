import * as fs from 'fs';
import * as path from 'path';
import { PrunedContextResult } from '../parser/resolver';
import { SymbolInfo, ImportInfo } from '../parser/tsParser';
import { sortFilesForCaching } from './cacheSorter';

function findProjectRoot(entryPath: string): string {
  let dir = path.dirname(path.resolve(entryPath));
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return path.dirname(path.resolve(entryPath));
}


export interface PruneOptions {
  mode: 'full' | 'decl';
  noMetrics?: boolean;
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
export function stripComments(code: string, lang?: string): string {
  if (lang === 'python') {
    return code
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
          return false;
        }
        return true;
      })
      .join('\n');
  }

  // For JS, TS, and Rust
  // Strip block comments (/* but not /**)
  let cleaned = code.replace(/\/\*(?!\*)([^*]|\*(?!\/))*\*\//g, '');
  
  return cleaned
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
    let bodyOutput = '';
    const projectRoot = findProjectRoot(entryFile);
    const { filePaths } = sortFilesForCaching(result, entryFile, projectRoot);


    for (const filePath of filePaths) {
      const neededSymbols = result.filesToSymbols[filePath];
      const fileDeps = result.parsedFiles[filePath];
      const isEntryFile = filePath === absoluteEntry;

      const relativePath = path.relative(process.cwd(), filePath);
      const ext = path.extname(filePath);
      let lang = 'typescript';
      if (ext === '.py') lang = 'python';
      else if (ext === '.rs') lang = 'rust';

      bodyOutput += `## File: \`${relativePath}\`\n`;
      bodyOutput += `\`\`\`${lang}\n`;

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
          if (!importedNeeded) return;

          const activeSpecifiers = imp.specifiers.filter(spec => {
            if (spec.exportName === '*') {
              return importedNeeded.size > 0;
            }
            return importedNeeded.has(spec.exportName);
          });
          
          if (activeSpecifiers.length === 0) {
            return;
          }

          if (lang === 'typescript') {
            const importRelPath = path.relative(path.dirname(filePath), imp.resolvedPath);
            const formattedPath = importRelPath.startsWith('.') ? importRelPath : './' + importRelPath;
            const cleanPath = formattedPath.replace(/\.(ts|tsx|js|jsx)$/, '');
            
            const namespaceSpec = activeSpecifiers.find(s => s.exportName === '*');
            if (namespaceSpec) {
              bodyOutput += `import * as ${namespaceSpec.localName} from '${cleanPath}';\n`;
            } else {
              const defaultSpec = activeSpecifiers.find(s => s.exportName === 'default');
              const namedSpecs = activeSpecifiers.filter(s => s.exportName !== 'default' && s.exportName !== '*');
              const parts: string[] = [];
              if (defaultSpec) {
                parts.push(defaultSpec.localName);
              }
              if (namedSpecs.length > 0) {
                const namedStrings = namedSpecs.map(s => {
                  if (s.localName === s.exportName) {
                    return s.localName;
                  } else {
                    return `${s.exportName} as ${s.localName}`;
                  }
                });
                parts.push(`{ ${namedStrings.join(', ')} }`);
              }
              bodyOutput += `import ${parts.join(', ')} from '${cleanPath}';\n`;
            }
          } else if (lang === 'python') {
            const pythonModule = getPythonRelativeModule(filePath, imp.resolvedPath);
            const nsSpec = activeSpecifiers.find(s => s.exportName === '*');
            if (nsSpec) {
              if (pythonModule.startsWith('.')) {
                const lastDot = pythonModule.lastIndexOf('.');
                const parentDots = pythonModule.substring(0, lastDot);
                const moduleName = pythonModule.substring(lastDot + 1);
                if (nsSpec.localName && nsSpec.localName !== moduleName) {
                  bodyOutput += `from ${parentDots || '.'} import ${moduleName} as ${nsSpec.localName}\n`;
                } else {
                  bodyOutput += `from ${parentDots || '.'} import ${moduleName}\n`;
                }
              } else {
                if (nsSpec.localName && nsSpec.localName !== pythonModule) {
                  bodyOutput += `import ${pythonModule} as ${nsSpec.localName}\n`;
                } else {
                  bodyOutput += `import ${pythonModule}\n`;
                }
              }
            } else {
              const namedStrings = activeSpecifiers.map(s => {
                if (s.localName === s.exportName) {
                  return s.localName;
                } else {
                  return `${s.exportName} as ${s.localName}`;
                }
              });
              bodyOutput += `from ${pythonModule} import ${namedStrings.join(', ')}\n`;
            }
          } else if (lang === 'rust') {
            const hasWildcard = activeSpecifiers.some(s => s.exportName === '*');
            if (hasWildcard) {
              const modName = imp.source.split('::').pop();
              bodyOutput += `mod ${modName};\n`;
            } else {
              const namedStrings = activeSpecifiers.map(s => {
                if (s.localName === s.exportName) {
                  return s.localName;
                } else {
                  return `${s.exportName} as ${s.localName}`;
                }
              });
              if (namedStrings.length === 1) {
                bodyOutput += `use ${imp.source}::${namedStrings[0]};\n`;
              } else if (namedStrings.length > 1) {
                bodyOutput += `use ${imp.source}::{${namedStrings.join(', ')}};\n`;
              }
            }
          }
        });
        bodyOutput += '\n';
      }

      // 2. Output symbols
      for (const symbol of fileDeps.symbols) {
        if (neededSymbols.has(symbol.name)) {
          let symbolCode = symbol.code;

          if (options.mode === 'decl' && !isEntryFile && symbol.declCode) {
            symbolCode = symbol.declCode;
          } else if (options.mode === 'decl' && !isEntryFile && symbol.type === 'function') {
            if (lang === 'python') {
              symbolCode = stripPythonFunctionBody(symbolCode);
            } else {
              symbolCode = stripFunctionBody(symbolCode);
            }
          }

          // Optimization: Strip comments
          symbolCode = stripComments(symbolCode, lang);

          bodyOutput += `${symbolCode}\n\n`;
        }
      }

      bodyOutput += '```\n\n';
    }

    // Calculate metrics
    let rawTotalCharacters = 0;
    for (const filePath of Object.keys(result.parsedFiles)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        rawTotalCharacters += content.length;
      } catch (e) {}
    }

    const rawTokens = Math.ceil(rawTotalCharacters / 3.7);
    const prunedTokens = Math.ceil(bodyOutput.length / 3.7);
    const reductionRatio = rawTokens / (prunedTokens || 1);
    const COST_PER_TOKEN = 1.50 / 1_000_000;
    const rawCost = (rawTokens * COST_PER_TOKEN).toFixed(5);
    const prunedCost = (prunedTokens * COST_PER_TOKEN).toFixed(5);
    const percentSavings = Math.round((1 - prunedTokens / (rawTokens || 1)) * 100);

    let output = '# ContextIt: Compressed Project Context\n\n';
    if (!options.noMetrics) {
      output += `> [!NOTE]\n`;
      output += `> **Context Slicing & Cost Reduction Metrics (Est.)**:\n`;
      output += `> - **Raw Context Size**: ~${rawTokens.toLocaleString()} tokens\n`;
      output += `> - **Pruned Context Size**: ~${prunedTokens.toLocaleString()} tokens (**${reductionRatio.toFixed(1)}x reduction**)\n`;
      output += `> - **Gemini 3.5 Flash Cost**: $${rawCost} &rarr; $${prunedCost} (**${percentSavings}% savings**)\n\n`;
    }

    output += bodyOutput;
    return output;
  }
}
