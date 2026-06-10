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

    const imports: ImportInfo[] = [];
    for (const imp of (result.imports || [])) {
      const submodules: any[] = [];
      const symbols: any[] = [];
      
      for (const spec of imp.specifiers) {
        let resolvedSourcePath: string | null = null;
        if (imp.source === '.') {
          resolvedSourcePath = path.dirname(absolutePath);
        } else {
          resolvedSourcePath = resolvePyImportPath(absolutePath, imp.source);
        }
        
        if (resolvedSourcePath) {
          const isDir = fs.existsSync(resolvedSourcePath) && fs.statSync(resolvedSourcePath).isDirectory();
          const parentDir = isDir ? resolvedSourcePath : path.dirname(resolvedSourcePath);
          
          const potentialPyFile = path.resolve(parentDir, spec.exportName + '.py');
          const potentialInitPyFile = path.resolve(parentDir, spec.exportName, '__init__.py');
          
          let resolvedSubmodulePath: string | null = null;
          if (fs.existsSync(potentialPyFile) && fs.statSync(potentialPyFile).isFile()) {
            resolvedSubmodulePath = potentialPyFile;
          } else if (fs.existsSync(potentialInitPyFile) && fs.statSync(potentialInitPyFile).isFile()) {
            resolvedSubmodulePath = potentialInitPyFile;
          }
          
          if (resolvedSubmodulePath) {
            submodules.push({
              source: imp.source === '.' ? '.' + spec.exportName : imp.source + '.' + spec.exportName,
              resolvedPath: resolvedSubmodulePath,
              specifiers: [{ localName: spec.localName, exportName: '*' }]
            });
            continue;
          }
        }
        symbols.push(spec);
      }
      
      for (const sub of submodules) {
        imports.push(sub);
      }
      
      if (symbols.length > 0) {
        const resolvedPath = resolvePyImportPath(absolutePath, imp.source);
        if (resolvedPath) {
          imports.push({
            source: imp.source,
            resolvedPath: resolvedPath,
            specifiers: symbols
          });
        }
      }
    }

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
