import * as fs from 'fs';
import * as path from 'path';
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';
import { stripClassMethods } from './csParser';


/**
 * Resolves local C/C++ include paths.
 */
export function resolveCppImportPath(importingFilePath: string, source: string): string | null {
  const dir = path.dirname(importingFilePath);
  
  const potentialPaths = [
    path.resolve(dir, source),
    path.resolve(dir, source + '.h'),
    path.resolve(dir, source + '.hpp'),
    path.resolve(dir, source + '.cpp'),
    path.resolve(dir, source + '.c'),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * Strips C/C++ function body, keeping signature and ending it with a semicolon.
 */
export function stripCppFunctionBody(code: string): string {
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
 * Parses C/C++ files (.c, .cpp, .cc, .h, .hpp, .hh) using regex and bracket matching.
 */
export function parseCppFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf-8');

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // Helper to extract identifiers (dependencies)
  function getIdentifiers(text: string): string[] {
    // Match variables, function names, type names, macro names
    const idRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const found = text.match(idRegex) || [];
    return Array.from(new Set(found));
  }

  // 1. Extract imports: #include "header.h" or #include <header.h>
  const includeRegex =/#include\s*["<]([^">]+)[">]/g;
  let match;
  while ((match = includeRegex.exec(code)) !== null) {
    const source = match[1];
    const resolvedPath = resolveCppImportPath(absolutePath, source);
    if (resolvedPath) {
      imports.push({
        source,
        resolvedPath,
        specifiers: [{ localName: '*', exportName: '*' }]
      });
    }
  }

  // 2. Extract macros / preprocessor definitions: #define NAME value
  const defineRegex = /#define\s+([a-zA-Z0-9_]+)(?:\(([^)]*)\))?/g;
  while ((match = defineRegex.exec(code)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    
    // Find the end of the define (escaped newlines allow multi-line defines)
    let endIndex = startIndex;
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '\n') {
        if (i > 0 && code[i - 1] === '\\') {
          continue; // Escaped newline, macro continues
        }
        endIndex = i;
        break;
      }
    }
    if (endIndex === startIndex) {
      endIndex = code.length;
    }

    const symbolCode = code.substring(startIndex, endIndex);
    const dependencies = getIdentifiers(symbolCode).filter(id => id !== name && id !== 'define');

    symbols.push({
      name,
      type: 'variable',
      start: startIndex,
      end: endIndex,
      code: symbolCode,
      declCode: symbolCode,
      dependencies
    });
  }

  // 3. Extract namespaces, classes, structs, enums, unions, and functions
  // A general regex to find candidates: struct X, class Y, namespace Z, void foo(...)
  const classFuncRegex = /(?:(class|struct|enum|union|namespace)\s+([a-zA-Z0-9_]+))|(?:([a-zA-Z0-9_<>\*&]+)\s+([a-zA-Z0-9_~]+)\s*\(([^)]*)\))/g;
  
  while ((match = classFuncRegex.exec(code)) !== null) {
    const isKeywordType = match[1] !== undefined;
    const typeKeyword = match[1];
    const typeName = match[2];
    
    const returnType = match[3];
    const funcName = match[4];
    
    const name = isKeywordType ? typeName : funcName;
    if (!name || ['if', 'for', 'while', 'switch', 'catch', 'return'].includes(name)) {
      continue;
    }

    const startIndex = match.index;
    let braceCount = 0;
    let endIndex = startIndex;
    let started = false;

    // Scan forward to match brackets/braces or find semicolons
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
      } else if (typeKeyword === 'class' || typeKeyword === 'struct' || typeKeyword === 'union') {
        symbolType = 'class';
      } else if (typeKeyword === 'enum') {
        symbolType = 'type';
      }
    } else {
      symbolType = 'function';
    }

    const declCode = symbolType === 'function' 
      ? stripCppFunctionBody(symbolCode) 
      : (symbolType === 'class' ? stripClassMethods(symbolCode) : symbolCode);


    // Check if symbol is already added (e.g. function declarations/definitions duplication)
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
