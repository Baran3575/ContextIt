import * as fs from 'fs';
import * as path from 'path';
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

let cachedProjectFiles: { filePath: string; namespaces: string[] }[] | null = null;

export function clearCsProjectCache() {
  cachedProjectFiles = null;
}

function getProjectCsFiles(currentFileDir: string): { filePath: string; namespaces: string[] }[] {
  if (cachedProjectFiles) {
    return cachedProjectFiles;
  }

  const files: string[] = [];
  const visited = new Set<string>();

  function walk(dir: string) {
    if (visited.has(dir)) return;
    visited.add(dir);
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['bin', 'obj', 'node_modules', '.git', 'dist'].includes(entry.name)) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.cs')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  walk(process.cwd());
  
  const absCurrentDir = path.resolve(currentFileDir);
  const absCwd = path.resolve(process.cwd());
  if (!absCurrentDir.startsWith(absCwd)) {
    walk(absCurrentDir);
  }

  const results: { filePath: string; namespaces: string[] }[] = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      const nsDeclRegex = /namespace\s+([a-zA-Z0-9_.]+)/g;
      const namespaces: string[] = [];
      let match;
      while ((match = nsDeclRegex.exec(content)) !== null) {
        namespaces.push(match[1]);
      }
      results.push({ filePath: f, namespaces });
    } catch (e) {
      // Ignore errors
    }
  }

  cachedProjectFiles = results;
  return results;
}

/**
 * Resolves local C# using/namespace paths.
 */
export function resolveCSharpImportPath(importingFilePath: string, source: string): string | null {
  const dir = path.dirname(importingFilePath);
  const targetPath = source.replace(/\./g, '/');

  const potentialPaths = [
    path.resolve(dir, targetPath + '.cs'),
    path.resolve(process.cwd(), targetPath + '.cs'),
    path.resolve(dir, path.join(targetPath, 'Class.cs')), // common convention fallback
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * Strips C# method body, keeping signature and annotations intact.
 */
export function stripCSharpMethodBody(code: string): string {
  const trimmed = code.trim();
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) {
    return code;
  }
  let signature = trimmed.substring(0, firstBrace).trim();
  if (!signature.endsWith(';')) {
    signature += ';';
  }
  return signature;
}

/**
 * Strips C# and C++ class method bodies, leaving method declarations empty.
 */
export function stripClassMethods(code: string): string {
  let output = '';
  let nestingLevel = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';
    
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        if (nestingLevel < 2) output += char;
      }
      continue;
    }
    if (inComment) {
      if (char === '*' && nextChar === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inComment = true;
      i++;
      continue;
    }
    
    if (inString) {
      if (char === '\\') {
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }
    
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      if (nestingLevel < 2) output += char;
      continue;
    }
    
    if (char === '{') {
      nestingLevel++;
      if (nestingLevel === 1) {
        output += char;
      } else if (nestingLevel === 2) {
        output += ' {}';
      }
      continue;
    }
    
    if (char === '}') {
      nestingLevel--;
      if (nestingLevel === 0) {
        output += char;
      }
      continue;
    }
    
    if (nestingLevel < 2) {
      output += char;
    }
  }
  
  return output;
}


/**
 * Parses C# files (.cs) using regex and bracket matching.
 */
export function parseCSharpFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf-8');

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // Helper to extract identifiers (dependencies)
  function getIdentifiers(text: string): string[] {
    const idRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const found = text.match(idRegex) || [];
    return Array.from(new Set(found));
  }

  // 1. Extract imports: using System; or using System.IO; or using MyNamespace;
  const usingRegex = /using\s+([a-zA-Z0-9_.]+)\s*;/g;
  const nsDeclRegex = /namespace\s+([a-zA-Z0-9_.]+)/g;
  const declaredNamespaces: string[] = [];
  const importedNamespaces: string[] = [];
  let match;

  while ((match = nsDeclRegex.exec(code)) !== null) {
    declaredNamespaces.push(match[1]);
  }

  while ((match = usingRegex.exec(code)) !== null) {
    importedNamespaces.push(match[1]);
  }

  const targetNamespaces = Array.from(new Set([...declaredNamespaces, ...importedNamespaces]));
  const projectFiles = getProjectCsFiles(path.dirname(absolutePath));

  for (const ns of targetNamespaces) {
    for (const pf of projectFiles) {
      if (pf.filePath === absolutePath) continue;
      if (pf.namespaces.includes(ns)) {
        imports.push({
          source: ns,
          resolvedPath: pf.filePath,
          specifiers: [{ localName: '*', exportName: '*' }]
        });
      }
    }
  }

  // Fallback to file-based matching if no namespaces resolved
  if (imports.length === 0) {
    for (const ns of importedNamespaces) {
      const resolvedPath = resolveCSharpImportPath(absolutePath, ns);
      if (resolvedPath) {
        imports.push({
          source: ns,
          resolvedPath,
          specifiers: [{ localName: '*', exportName: '*' }]
        });
      }
    }
  }

  // 2. Extract classes, interfaces, structs, enums, namespaces and methods
  // Match namespaces: namespace MyProject
  // Match classes: public class MyClass : BaseClass
  // Match methods: public void MyMethod(string x)
  const csSymbolRegex = /(?:(namespace|class|interface|struct|enum)\s+([a-zA-Z0-9_]+))|(?:(public|private|protected|internal|static|async|virtual|override)?\s*([a-zA-Z0-9_<>\[\]]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\))/g;

  while ((match = csSymbolRegex.exec(code)) !== null) {
    const isKeywordType = match[1] !== undefined;
    const typeKeyword = match[1];
    const typeName = match[2];

    const modifier = match[3];
    const returnType = match[4];
    const methodName = match[5];

    const name = isKeywordType ? typeName : methodName;
    if (!name || ['if', 'for', 'while', 'switch', 'catch', 'return', 'using', 'new'].includes(name)) {
      continue;
    }

    const startIndex = match.index;
    let braceCount = 0;
    let endIndex = startIndex;
    let started = false;

    // Scan forward to match brackets/braces
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        started = true;
      } else if (code[i] === '}') {
        braceCount--;
      }

      if (!started && code[i] === ';') {
        endIndex = i + 1;
        break;
      }

      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex === startIndex) {
      endIndex = code.indexOf('\n', startIndex);
      if (endIndex === -1) endIndex = code.length;
    }

    const symbolCode = code.substring(startIndex, endIndex);
    const dependencies = getIdentifiers(symbolCode).filter(id => id !== name);

    let symbolType: SymbolInfo['type'] = 'other';
    if (isKeywordType) {
      if (typeKeyword === 'namespace') {
        symbolType = 'other';
      } else if (typeKeyword === 'class' || typeKeyword === 'struct' || typeKeyword === 'interface') {
        symbolType = 'class';
      } else if (typeKeyword === 'enum') {
        symbolType = 'type';
      }
    } else {
      symbolType = 'function';
    }

    const declCode = symbolType === 'function' 
      ? stripCSharpMethodBody(symbolCode) 
      : (symbolType === 'class' ? stripClassMethods(symbolCode) : symbolCode);


    if (!symbols.some(s => s.name === name && s.start === startIndex)) {
      symbols.push({
        name,
        type: symbolType,
        start: startIndex,
        end: endIndex,
        code: symbolCode,
        declCode,
        dependencies
      });
    }
  }

  return {
    filePath: absolutePath,
    imports,
    symbols
  };
}
