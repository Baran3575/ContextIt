import * as fs from 'fs';
import * as path from 'path';
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

/**
 * Resolves local Rust module paths.
 * Supports standard module layouts as well as submodule directories.
 */
export function resolveRustImportPath(importingFilePath: string, source: string): string | null {
  const dir = path.dirname(importingFilePath);
  const baseName = path.basename(importingFilePath, '.rs');
  
  // Clean crate prefix
  let cleanSource = source.replace(/^crate::/, '').replace(/^super::/, '../').replace(/^self::/, './');
  const targetPath = cleanSource.replace(/::/g, '/');

  const potentialPaths = [
    // Standard layout
    path.resolve(dir, targetPath + '.rs'),
    path.resolve(dir, path.join(targetPath, 'mod.rs')),
    
    // Submodule layout: e.g. if db.rs declares mod queries, look under db/queries.rs
    path.resolve(dir, baseName, targetPath + '.rs'),
    path.resolve(dir, baseName, path.join(targetPath, 'mod.rs')),
    
    // Super fallback
    path.resolve(dir, '../', targetPath + '.rs'),
    path.resolve(dir, '../', path.join(targetPath, 'mod.rs')),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * Helper to strip the body of a Rust function.
 */
function stripRustFunctionBody(code: string): string {
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
 * Helper to strip method bodies from Rust impl blocks, replacing them with empty braces.
 */
function stripRustImplBodies(code: string): string {
  let result = '';
  let currentIndex = 0;
  
  while (true) {
    const fnIdx = code.indexOf('fn ', currentIndex);
    if (fnIdx === -1) {
      result += code.substring(currentIndex);
      break;
    }
    
    result += code.substring(currentIndex, fnIdx);
    
    const openBraceIdx = code.indexOf('{', fnIdx);
    if (openBraceIdx === -1) {
      result += code.substring(fnIdx, fnIdx + 3);
      currentIndex = fnIdx + 3;
      continue;
    }
    
    result += code.substring(fnIdx, openBraceIdx + 1);
    
    let braceCount = 1;
    let scanIdx = openBraceIdx + 1;
    while (scanIdx < code.length && braceCount > 0) {
      if (code[scanIdx] === '{') braceCount++;
      else if (code[scanIdx] === '}') braceCount--;
      scanIdx++;
    }
    
    result += ' }';
    currentIndex = scanIdx;
  }
  
  return result;
}

/**
 * A robust Rust parser using regex, keyword scanning, and brace/paren/bracket matching.
 * Extracts imports (use, mod) and symbols (fn, struct, enum, trait, impl, type, const, static, macro_rules!).
 */
export function parseRustFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf-8');

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // Helper to extract identifiers (dependencies)
  function getIdentifiers(text: string): string[] {
    const idRegex = /[a-zA-Z_][a-zA-Z0-9_]*(?:::[a-zA-Z_][a-zA-Z0-9_]*)*/g;
    const found = text.match(idRegex) || [];
    return Array.from(new Set(found));
  }

  // 1. Extract imports (use crate::x::y; or mod x;)
  const useRegex = /use\s+([a-zA-Z0-9_:]+)(?:::\{([a-zA-Z0-9_,\s\:]+)\})?;/g;
  let match;
  while ((match = useRegex.exec(code)) !== null) {
    const fullSource = match[1];
    const specifierString = match[2];

    const sourceParts = fullSource.split('::');
    const lastPart = sourceParts[sourceParts.length - 1];
    
    let source = fullSource;
    let specifiers: string[] = [];

    if (specifierString) {
      specifiers = specifierString.split(',').map(s => {
        const parts = s.trim().split(' as ');
        return parts[0].trim();
      });
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
        specifiers: specifiers.map(spec => ({
          localName: spec,
          exportName: spec
        }))
      });
    }
  }

  const modRegex = /(?:pub\s+)?mod\s+([a-zA-Z0-9_]+)\s*;/g;
  while ((match = modRegex.exec(code)) !== null) {
    const source = match[1];
    const resolvedPath = resolveRustImportPath(absolutePath, source);
    if (resolvedPath) {
      imports.push({
        source,
        resolvedPath,
        specifiers: [{ localName: source, exportName: '*' }]
      });
    }
  }

  // 2. Extract symbols (fn, struct, enum, trait, impl, type, const, static)
  const symbolRegex = /(?:pub\s+)?(fn|struct|enum|trait|impl|type|const|static)(?:\s+<[a-zA-Z0-9_,\s]+>)?\s+([a-zA-Z0-9_]+)/g;
  
  while ((match = symbolRegex.exec(code)) !== null) {
    const keyword = match[1];
    const originalName = match[2];
    const startIndex = match.index;
    
    // Find matching brace/semicolon to get complete symbol code
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
      
      // If it ends with semicolon without body (consts, statics, type aliases, unit structs)
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
    const dependencies = getIdentifiers(symbolCode).filter(id => id !== originalName);

    // Determine type
    let type: SymbolInfo['type'] = 'other';
    if (keyword === 'fn') {
      type = 'function';
    } else if (['struct', 'enum', 'trait'].includes(keyword)) {
      type = 'interface';
    }

    // Special logic for implementation blocks
    if (keyword === 'impl') {
      const header = code.substring(startIndex, code.indexOf('{', startIndex));
      const cleanHeader = header.replace(/<[^>]+>/g, '');
      const forMatch = cleanHeader.match(/for\s+([a-zA-Z0-9_]+)/);
      const declCode = stripRustImplBodies(symbolCode);
      
      if (forMatch) {
        // impl Trait for StructName
        const structName = forMatch[1];
        const traitMatch = cleanHeader.match(/impl\s+([a-zA-Z0-9_]+)\s+for/);
        const traitName = traitMatch ? traitMatch[1] : null;

        symbols.push({
          name: structName,
          type: 'other',
          start: startIndex,
          end: endIndex,
          code: symbolCode,
          declCode,
          dependencies: dependencies.filter(id => id !== structName)
        });

        if (traitName) {
          symbols.push({
            name: traitName,
            type: 'other',
            start: startIndex,
            end: endIndex,
            code: symbolCode,
            declCode,
            dependencies: dependencies.filter(id => id !== traitName)
          });
        }
      } else {
        // impl StructName
        const structMatch = cleanHeader.match(/impl\s+([a-zA-Z0-9_]+)/);
        if (structMatch) {
          const structName = structMatch[1];
          symbols.push({
            name: structName,
            type: 'other',
            start: startIndex,
            end: endIndex,
            code: symbolCode,
            declCode,
            dependencies: dependencies.filter(id => id !== structName)
          });
        }
      }
    } else {
      // General symbols
      const declCode = keyword === 'fn' ? stripRustFunctionBody(symbolCode) : symbolCode;
      symbols.push({
        name: originalName,
        type,
        start: startIndex,
        end: endIndex,
        code: symbolCode,
        declCode,
        dependencies
      });
    }
  }

  // 3. Extract macro definitions (macro_rules!)
  const macroRegex = /(?:#\[macro_export\]\s+)?macro_rules!\s+([a-zA-Z0-9_]+)/g;
  while ((match = macroRegex.exec(code)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    
    let braceCount = 0;
    let endIndex = startIndex;
    let started = false;
    let openBrace = '{';
    let closeBrace = '}';

    for (let i = startIndex; i < code.length; i++) {
      if (!started && (code[i] === '{' || code[i] === '(' || code[i] === '[')) {
        openBrace = code[i];
        closeBrace = code[i] === '{' ? '}' : (code[i] === '(' ? ')' : ']');
        braceCount++;
        started = true;
      } else if (started && code[i] === openBrace) {
        braceCount++;
      } else if (started && code[i] === closeBrace) {
        braceCount--;
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

    symbols.push({
      name,
      type: 'other',
      start: startIndex,
      end: endIndex,
      code: symbolCode,
      declCode: symbolCode,
      dependencies
    });
  }

  return {
    filePath: absolutePath,
    imports,
    symbols
  };
}
