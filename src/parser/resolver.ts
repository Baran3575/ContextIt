import * as path from 'path';
import { parseTSFile, FileDependencies, ImportInfo } from './tsParser';
import { parsePythonFile } from './pyParser';
import { parseRustFile } from './rsParser';
import { parseCppFile } from './cppParser';
import { parseCSharpFile } from './csParser';

export interface PrunedContextResult {
  // Mapping of file path to the set of symbol names that are actually needed
  filesToSymbols: Record<string, Set<string>>;
  // Mapping of file path to its parsed metadata
  parsedFiles: Record<string, FileDependencies>;
}

export class DependencyResolver {
  private parsedFiles: Record<string, FileDependencies> = {};

  private getOrParseFile(filePath: string): FileDependencies {
    if (!this.parsedFiles[filePath]) {
      const ext = path.extname(filePath);
      if (ext === '.py') {
        this.parsedFiles[filePath] = parsePythonFile(filePath);
      } else if (ext === '.rs') {
        this.parsedFiles[filePath] = parseRustFile(filePath);
      } else if (['.c', '.cpp', '.cc', '.h', '.hpp', '.hh'].includes(ext)) {
        this.parsedFiles[filePath] = parseCppFile(filePath);
      } else if (ext === '.cs') {
        this.parsedFiles[filePath] = parseCSharpFile(filePath);
      } else {
        this.parsedFiles[filePath] = parseTSFile(filePath);
      }
    }
    return this.parsedFiles[filePath];
  }

  /**
   * Resolves recursive dependencies starting from an entry file and optional target symbol.
   */
  public resolve(entryFile: string, targetSymbol?: string): PrunedContextResult {
    const absoluteEntry = path.resolve(entryFile);
    const filesToSymbols: Record<string, Set<string>> = {};

    // Initialize entry file mapping
    filesToSymbols[absoluteEntry] = new Set<string>();



    if (!targetSymbol) {
      // If no target symbol, recursively include ALL files and ALL symbols in the import tree.
      const visited = new Set<string>([absoluteEntry]);
      const queue = [absoluteEntry];

      while (queue.length > 0) {
        const currentFile = queue.shift()!;
        const deps = this.getOrParseFile(currentFile);
        
        // Add all symbols in this file
        filesToSymbols[currentFile] = new Set(deps.symbols.map(s => s.name));

        for (const imp of deps.imports) {
          if (imp.resolvedPath && !visited.has(imp.resolvedPath)) {
            visited.add(imp.resolvedPath);
            queue.push(imp.resolvedPath);
          }
        }
      }
    } else {
      // Trace dependencies starting from the specific symbol
      const visitedSymbols = new Set<string>(); // Format: "filePath::symbolName"
      const queue: { filePath: string; symbolName: string }[] = [
        { filePath: absoluteEntry, symbolName: targetSymbol }
      ];

      while (queue.length > 0) {
        const { filePath, symbolName } = queue.shift()!;
        const symbolKey = `${filePath}::${symbolName}`;

        if (visitedSymbols.has(symbolKey)) {
          continue;
        }
        visitedSymbols.add(symbolKey);

        const fileDeps = this.getOrParseFile(filePath);

        if (symbolName === '*') {
          // Queue all top-level symbols in this file
          fileDeps.symbols.forEach(s => {
            queue.push({ filePath, symbolName: s.name });
          });
          continue;
        }

        const symbolDef = fileDeps.symbols.find(s => s.name === symbolName);

        if (!symbolDef) {
          // Symbol not found in this file (could be an import from another file we haven't mapped yet)
          // Let's check if the symbol is imported
          const matched = this.findImportForSymbol(fileDeps, symbolName);
          if (matched && matched.import.resolvedPath) {
            const { import: imp, specifier: spec } = matched;
            if (spec.exportName === '*') {
              queue.push({ filePath: imp.resolvedPath, symbolName: '*' });
            } else {
              queue.push({ filePath: imp.resolvedPath, symbolName: spec.exportName });
            }
          }
          continue;
        }

        // Add this symbol to our output list
        if (!filesToSymbols[filePath]) {
          filesToSymbols[filePath] = new Set<string>();
        }
        filesToSymbols[filePath].add(symbolName);

        // Analyze dependencies of this symbol
        for (const depName of symbolDef.dependencies) {
          // 1. Is it imported?
          const matched = this.findImportForSymbol(fileDeps, depName);
          if (matched && matched.import.resolvedPath) {
            const { import: imp, specifier: spec } = matched;
            if (spec.exportName === '*') {
              queue.push({ filePath: imp.resolvedPath, symbolName: '*' });
            } else {
              queue.push({ filePath: imp.resolvedPath, symbolName: spec.exportName });
            }
          } else {
            // 2. Is it a local symbol?
            const isLocal = fileDeps.symbols.some(s => s.name === depName);
            if (isLocal) {
              queue.push({ filePath, symbolName: depName });
            }
          }
        }
      }
    }

    return {
      filesToSymbols,
      parsedFiles: this.parsedFiles
    };
  }

  private findImportForSymbol(fileDeps: FileDependencies, symbolName: string): { import: ImportInfo; specifier: any } | null {
    const nsSeparator = symbolName.includes('::') ? '::' : '.';
    let bestMatch: { import: ImportInfo; specifier: any; prefixLength: number } | null = null;

    for (const imp of fileDeps.imports) {
      for (const spec of imp.specifiers) {
        const local = spec.localName;
        if (symbolName === local) {
          const length = local.length;
          if (!bestMatch || length > bestMatch.prefixLength) {
            bestMatch = { import: imp, specifier: spec, prefixLength: length };
          }
        } else if (symbolName.startsWith(local + nsSeparator)) {
          const length = local.length;
          if (!bestMatch || length > bestMatch.prefixLength) {
            const propName = symbolName.substring(local.length + nsSeparator.length);
            bestMatch = {
              import: imp,
              specifier: spec.exportName === '*' ? {
                localName: symbolName,
                exportName: propName
              } : spec,
              prefixLength: length
            };
          }
        }
      }
    }

    if (bestMatch) {
      return { import: bestMatch.import, specifier: bestMatch.specifier };
    }

    // Fallback: Check star imports (localName === '*')
    for (const imp of fileDeps.imports) {
      for (const spec of imp.specifiers) {
        if (spec.localName === '*' && imp.resolvedPath) {
          try {
            const importedDeps = this.getOrParseFile(imp.resolvedPath);
            const hasSymbol = importedDeps.symbols.some(s => s.name === symbolName);
            if (hasSymbol) {
              return {
                import: imp,
                specifier: { localName: symbolName, exportName: symbolName }
              };
            }
          } catch (e) {
            // Ignore errors reading files during dependency tracing
          }
        }
      }
    }

    return null;
  }
}
