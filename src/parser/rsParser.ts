import * as fs from 'fs';
import * as path from 'path';
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

/**
 * Resolves local Rust module paths.
 */
export function resolveRustImportPath(importingFilePath: string, source: string): string | null {
  const dir = path.dirname(importingFilePath);
  
  // Clean crate prefix
  let cleanSource = source.replace(/^crate::/, '').replace(/^super::/, '../').replace(/^self::/, './');
  const targetPath = cleanSource.replace(/::/g, '/');

  const potentialPaths = [
    path.resolve(dir, targetPath + '.rs'),
    path.resolve(dir, path.join(targetPath, 'mod.rs')),
    path.resolve(dir, '../', targetPath + '.rs'), // super fallback
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * A semi-Rust parser using regex and brace-matching.
 * Extracts imports (use, mod) and symbols (fn, struct, enum, trait, impl).
 */
export function parseRustFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf-8');

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // 1. Extract imports (use crate::x::y; or mod x;)
  const useRegex = /use\s+([a-zA-Z0-9_:]+)(?:::\{([a-zA-Z0-9_,\s]+)\})?;/g;
  let match;
  while ((match = useRegex.exec(code)) !== null) {
    const fullSource = match[1];
    const specifierString = match[2];

    const sourceParts = fullSource.split('::');
    const lastPart = sourceParts[sourceParts.length - 1];
    
    // If it is use crate::utils::hash; then utils is source, hash is specifier
    // If use crate::utils::{hash, salt}; then utils is source, [hash, salt] are specifiers
    let source = fullSource;
    let specifiers: string[] = [];

    if (specifierString) {
      specifiers = specifierString.split(',').map(s => s.trim());
    } else {
      source = sourceParts.slice(0, -1).join('::');
      specifiers = [lastPart];
    }

    if (!source) {
      source = lastPart;
    }

    const resolvedPath = resolveRustImportPath(absolutePath, source);
    if (resolvedPath) {
      imports.push({
        source,
        resolvedPath,
        specifiers
      });
    }
  }

  const modRegex = /mod\s+([a-zA-Z0-9_]+);/g;
  while ((match = modRegex.exec(code)) !== null) {
    const source = match[1];
    const resolvedPath = resolveRustImportPath(absolutePath, source);
    if (resolvedPath) {
      imports.push({
        source,
        resolvedPath,
        specifiers: ['*']
      });
    }
  }

  // Helper to extract identifiers (dependencies)
  function getIdentifiers(text: string): string[] {
    const idRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const found = text.match(idRegex) || [];
    return Array.from(new Set(found));
  }

  // 2. Extract symbols (fn, struct, enum, trait, impl)
  // Match top-level blocks
  const symbolRegex = /(?:pub\s+)?(?:fn|struct|enum|trait|impl)(?:\s+<[a-zA-Z0-9_,\s]+>)?\s+([a-zA-Z0-9_]+)/g;
  
  while ((match = symbolRegex.exec(code)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    
    // Find matching brace of block to get complete symbol code
    let braceCount = 0;
    let endIndex = startIndex;
    let started = false;

    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        started = true;
      } else if (code[i] === '}') {
        braceCount--;
      }
      
      // If it's a struct/enum declaration ending with semicolon (no body)
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

    // Determine type
    let type: SymbolInfo['type'] = 'other';
    const keywordMatch = symbolCode.match(/(fn|struct|enum|trait|impl)/);
    if (keywordMatch) {
      if (keywordMatch[1] === 'fn') type = 'function';
      else if (['struct', 'enum', 'trait'].includes(keywordMatch[1])) type = 'interface';
    }

    symbols.push({
      name,
      type,
      start: startIndex,
      end: endIndex,
      code: symbolCode,
      dependencies
    });
  }

  return {
    filePath: absolutePath,
    imports,
    symbols
  };
}
