import * as path from 'path';
import { parseTSFile, FileDependencies, SymbolInfo, ImportInfo } from './tsParser';
import { parsePythonFile } from './pyParser';
import { parseRustFile } from './rsParser';

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

    const startFileDeps = this.getOrParseFile(absoluteEntry);

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
        const symbolDef = fileDeps.symbols.find(s => s.name === symbolName);

        if (!symbolDef) {
          // Symbol not found in this file (could be an import from another file we haven't mapped yet)
          // Let's check if the symbol is imported
          const imp = this.findImportForSymbol(fileDeps, symbolName);
          if (imp && imp.resolvedPath) {
            queue.push({ filePath: imp.resolvedPath, symbolName });
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
          const imp = this.findImportForSymbol(fileDeps, depName);
          if (imp && imp.resolvedPath) {
            // It's imported from another file. Queue that symbol in the imported file.
            // If imported as default/namespace, we still look up the same name for now.
            queue.push({ filePath: imp.resolvedPath, symbolName: depName });
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

  /**
   * Finds which import declaration in the file brings in the given symbol.
   */
  private findImportForSymbol(fileDeps: FileDependencies, symbolName: string): ImportInfo | null {
    for (const imp of fileDeps.imports) {
      // Direct import matching: `import { foo } from 'bar'`
      if (imp.specifiers.includes(symbolName)) {
        return imp;
      }
      // Namespace/Default imports: we check if the file exists and let the resolver look for the symbol there
      if (imp.specifiers.includes('*') || imp.specifiers.includes('default')) {
        return imp;
      }
    }
    return null;
  }
}
