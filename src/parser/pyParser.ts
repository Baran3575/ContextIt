import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

/**
 * Resolves local python import paths.
 */
export function resolvePyImportPath(importingFilePath: string, source: string): string | null {
  const dir = path.dirname(importingFilePath);
  
  // Handle relative imports e.g. .utils or ..helpers
  if (source.startsWith('.')) {
    let cleanSource = source;
    let currentDir = dir;
    
    // Resolve relative dots
    while (cleanSource.startsWith('.')) {
      cleanSource = cleanSource.slice(1);
      if (cleanSource.startsWith('.')) {
        currentDir = path.dirname(currentDir);
      }
    }
    
    const relativeTarget = cleanSource.replace(/\./g, '/');
    const potentialPaths = [
      path.resolve(currentDir, relativeTarget + '.py'),
      path.resolve(currentDir, path.join(relativeTarget, '__init__.py')),
    ];

    for (const p of potentialPaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    }
  }

  // Handle absolute imports that might be local files in the project
  // Check if a file named 'source.py' exists relative to importing file, or relative to project root
  const localTarget = source.replace(/\./g, '/');
  const potentialPaths = [
    path.resolve(dir, localTarget + '.py'),
    path.resolve(dir, path.join(localTarget, '__init__.py')),
    path.resolve(process.cwd(), localTarget + '.py'),
    path.resolve(process.cwd(), path.join(localTarget, '__init__.py')),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * Parses a Python file by calling the python3 ast parser script.
 */
export function parsePythonFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const parserScript = path.join(__dirname, 'pyParser.py');

  try {
    // Run the python script to parse AST and output JSON
    const output = execSync(`python3 ${parserScript} ${absolutePath}`, { stdio: 'pipe' }).toString();
    const result = JSON.parse(output);

    if (result.error) {
      throw new Error(result.error);
    }

    const imports: ImportInfo[] = (result.imports || []).map((imp: any) => {
      const resolvedPath = resolvePyImportPath(absolutePath, imp.source);
      return {
        source: imp.source,
        resolvedPath: resolvedPath || '',
        specifiers: imp.specifiers || []
      };
    }).filter((imp: ImportInfo) => imp.resolvedPath !== '');

    const symbols: SymbolInfo[] = (result.symbols || []).map((sym: any) => ({
      name: sym.name,
      type: sym.type as 'function' | 'class' | 'other',
      start: sym.start,
      end: sym.end,
      code: sym.code,
      declCode: sym.declCode || sym.code,
      dependencies: sym.dependencies || []
    }));

    return {
      filePath: absolutePath,
      imports,
      symbols
    };
  } catch (error: any) {
    // Return empty dependencies in case of python parse error
    console.error(`Python parsing error on ${filePath}:`, error.message || error);
    return {
      filePath: absolutePath,
      imports: [],
      symbols: []
    };
  }
}
