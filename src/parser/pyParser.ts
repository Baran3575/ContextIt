import * as path from 'path';
import * as fs from 'fs';
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
    
    if (cleanSource.length === 0) {
      return currentDir;
    }
    
    const relativeTarget = cleanSource.replace(/\./g, '/');
    const potentialPaths = [
      path.resolve(currentDir, relativeTarget + '.py'),
      path.resolve(currentDir, path.join(relativeTarget, '__init__.py')),
      path.resolve(currentDir, relativeTarget)
    ];

    for (const p of potentialPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  // Handle absolute imports that might be local files in the project
  const localTarget = source.replace(/\./g, '/');
  const potentialPaths = [
    path.resolve(dir, localTarget + '.py'),
    path.resolve(dir, path.join(localTarget, '__init__.py')),
    path.resolve(dir, localTarget),
    path.resolve(process.cwd(), localTarget + '.py'),
    path.resolve(process.cwd(), path.join(localTarget, '__init__.py')),
    path.resolve(process.cwd(), localTarget)
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Checks if a line is empty or just a comment.
 */
function isLineEmptyOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith('#');
}

/**
 * Gets the indentation level (number of leading spaces/tabs) of a line.
 */
function getIndentationLevel(line: string): number {
  const match = line.match(/^([ \t]*)/);
  if (!match) return 0;
  let score = 0;
  for (const char of match[1]) {
    if (char === '\t') score += 4;
    else score += 1;
  }
  return score;
}

/**
 * Parses a Python file in pure TypeScript.
 * Uses regular expressions and indentation-based scanning to extract imports and top-level symbols.
 */
export function parsePythonFile(filePath: string): FileDependencies {
  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, 'utf-8');
  const lines = code.split('\n');

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // Track local names of imported packages/modules to distinguish them
  const importLocalNames = new Set<string>();

  // 1. First Pass: Parse Imports and collect local import names
  const importRegex = /^\s*import\s+([a-zA-Z0-9_.,\s]+)/;
  const fromImportRegex = /^\s*from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_.,\s()]+)/;

  for (const line of lines) {
    // Match "import X" or "import X as Y"
    const importMatch = line.match(importRegex);
    if (importMatch) {
      const parts = importMatch[1].split(',');
      for (const part of parts) {
        const subParts = part.trim().split(/\s+as\s+/);
        const source = subParts[0].trim();
        const alias = subParts[1] ? subParts[1].trim() : source;
        importLocalNames.add(alias);

        const resolvedPath = resolvePyImportPath(absolutePath, source);
        if (resolvedPath && fs.statSync(resolvedPath).isFile()) {
          imports.push({
            source,
            resolvedPath,
            specifiers: [{ localName: alias, exportName: '*' }]
          });
        }
      }
      continue;
    }

    // Match "from X import Y, Z"
    const fromImportMatch = line.match(fromImportRegex);
    if (fromImportMatch) {
      const source = fromImportMatch[1].trim();
      const importList = fromImportMatch[2].replace(/[()]/g, '');
      const parts = importList.split(',');
      
      const parsedSpecifiers = parts.map(part => {
        const subParts = part.trim().split(/\s+as\s+/);
        const name = subParts[0].trim();
        const alias = subParts[1] ? subParts[1].trim() : name;
        return { localName: alias, exportName: name };
      }).filter(s => s.localName.length > 0);

      // Resolve base path
      const baseResolved = source === '.' ? path.dirname(absolutePath) : resolvePyImportPath(absolutePath, source);

      if (baseResolved) {
        const parentDir = fs.statSync(baseResolved).isDirectory() ? baseResolved : path.dirname(baseResolved);
        
        const normalSpecifiers: typeof parsedSpecifiers = [];

        for (const spec of parsedSpecifiers) {
          importLocalNames.add(spec.localName);
          
          const potentialFile = path.resolve(parentDir, spec.exportName + '.py');
          const potentialInitFile = path.resolve(parentDir, spec.exportName, '__init__.py');
          
          let resolvedSub: string | null = null;
          if (fs.existsSync(potentialFile) && fs.statSync(potentialFile).isFile()) {
            resolvedSub = potentialFile;
          } else if (fs.existsSync(potentialInitFile) && fs.statSync(potentialInitFile).isFile()) {
            resolvedSub = potentialInitFile;
          }

          if (resolvedSub) {
            const subSource = source === '.' ? '.' + spec.exportName : source + '.' + spec.exportName;
            imports.push({
              source: subSource,
              resolvedPath: resolvedSub,
              specifiers: [{ localName: spec.localName, exportName: '*' }]
            });
          } else {
            normalSpecifiers.push(spec);
          }
        }

        if (normalSpecifiers.length > 0 && fs.statSync(baseResolved).isFile()) {
          imports.push({
            source,
            resolvedPath: baseResolved,
            specifiers: normalSpecifiers
          });
        }
      }
    }
  }

  // Helper to extract identifiers for dependencies, respecting namespace property access
  function getIdentifiers(symbolCode: string): string[] {
    const refs = new Set<string>();
    
    // Match namespace attribute access e.g., u.hash_password or my_math.add_numbers
    const attrRegex = /[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
    const found = symbolCode.match(attrRegex) || [];
    
    for (const ref of found) {
      const parts = ref.split('.');
      if (parts.length > 1) {
        let isImportNs = false;
        for (let i = 1; i <= parts.length - 1; i++) {
          const prefix = parts.slice(0, i).join('.');
          if (importLocalNames.has(prefix)) {
            isImportNs = true;
            refs.add(parts.slice(0, i + 1).join('.')); // Add namespace + property, e.g. "u.hash_password"
            break;
          }
        }
        if (isImportNs) continue;
      }
      
      refs.add(parts[0]);
    }
    
    return Array.from(refs);
  }

  // 2. Second Pass: Extract top-level symbols
  let charOffset = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineLength = line.length + 1; // +1 for newline

    // Skip import lines during symbol extraction
    if (line.match(importRegex) || line.match(fromImportRegex)) {
      charOffset += lineLength;
      continue;
    }

    const baseIndent = getIndentationLevel(line);
    
    if (baseIndent === 0 && !isLineEmptyOrComment(line)) {
      const defMatch = line.match(/^(async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/);
      const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);
      const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*(?::\s*[a-zA-Z0-9_.[\]]+)?\s*=\s*/);

      if (defMatch || classMatch || assignMatch) {
        const name = defMatch ? defMatch[2] : (classMatch ? classMatch[1] : assignMatch![1]);
        const type: SymbolInfo['type'] = defMatch ? 'function' : (classMatch ? 'class' : 'variable');
        
        let startChar = charOffset;
        let startLine = lineIndex;

        // Scan upwards to capture decorators (lines starting with @)
        while (startLine > 0 && lines[startLine - 1].trim().startsWith('@')) {
          startLine--;
          startChar -= (lines[startLine].length + 1);
        }
        
        let endLine = lineIndex;

        // Scan forward to find end of block based on indentation
        for (let j = lineIndex + 1; j < lines.length; j++) {
          if (isLineEmptyOrComment(lines[j])) {
            endLine = j;
            continue;
          }
          const indent = getIndentationLevel(lines[j]);
          if (indent <= baseIndent) {
            break; // Block ended
          }
          endLine = j;
        }

        // Extract code
        const blockLines = lines.slice(startLine, endLine + 1);
        const symbolCode = blockLines.join('\n');
        const endChar = startChar + symbolCode.length;

        const dependencies = getIdentifiers(symbolCode).filter(id => id !== name && id !== 'def' && id !== 'class' && id !== 'self');

        // Extract declaration code
        let declCode = symbolCode;
        if (type === 'function') {
          const relativeDefIndex = lineIndex - startLine;
          let sigEndLine = relativeDefIndex;
          let parenCount = 0;
          for (let k = relativeDefIndex; k < blockLines.length; k++) {
            const bl = blockLines[k];
            for (const char of bl) {
              if (char === '(') parenCount++;
              else if (char === ')') parenCount--;
            }
            if (parenCount === 0 && bl.trim().endsWith(':')) {
              sigEndLine = k;
              break;
            }
          }
          const sigLines = blockLines.slice(0, sigEndLine + 1);
          const indentSpace = line.match(/^([ \t]*)/)?.[1] || '';
          
          let docstringLines: string[] = [];
          let docstringQuote = '';
          let nextLineIndex = sigEndLine + 1;
          while (nextLineIndex < blockLines.length && blockLines[nextLineIndex].trim() === '') {
            nextLineIndex++;
          }
          if (nextLineIndex < blockLines.length) {
            const firstBodyLine = blockLines[nextLineIndex].trim();
            if (firstBodyLine.startsWith('"""') || firstBodyLine.startsWith("'''")) {
              docstringQuote = firstBodyLine.startsWith('"""') ? '"""' : "'''";
              const restOfLine = firstBodyLine.substring(3);
              if (restOfLine.includes(docstringQuote)) {
                docstringLines.push(blockLines[nextLineIndex]);
              } else {
                docstringLines.push(blockLines[nextLineIndex]);
                for (let n = nextLineIndex + 1; n < blockLines.length; n++) {
                  docstringLines.push(blockLines[n]);
                  if (blockLines[n].includes(docstringQuote)) {
                    break;
                  }
                }
              }
            }
          }
          let docstringPart = '';
          if (docstringLines.length > 0) {
            docstringPart = '\n' + docstringLines.join('\n');
          }
          declCode = sigLines.join('\n') + docstringPart + `\n${indentSpace}    pass`;
        } else if (type === 'class') {
          const classLines = symbolCode.split('\n');
          const outputLines: string[] = [];
          let skipIndentLevel = -1;
          
          for (let k = 0; k < classLines.length; k++) {
            const l = classLines[k];
            const trimmed = l.trim();
            if (trimmed === '') {
              if (skipIndentLevel === -1) {
                outputLines.push(l);
              }
              continue;
            }
            
            const currentIndent = l.match(/^([ \t]*)/)?.[0].length || 0;
            
            if (skipIndentLevel !== -1) {
              if (currentIndent > skipIndentLevel) {
                continue; // Skip the method body line
              } else {
                skipIndentLevel = -1; // End skipping
              }
            }
            
            if (trimmed.startsWith('def ')) {
              // Extract method signature lines
              let sigLines: string[] = [l];
              let parenCount = 0;
              for (const char of l) {
                if (char === '(') parenCount++;
                else if (char === ')') parenCount--;
              }
              
              let m = k;
              while (parenCount > 0 && m + 1 < classLines.length) {
                m++;
                const nextLine = classLines[m];
                sigLines.push(nextLine);
                for (const char of nextLine) {
                  if (char === '(') parenCount++;
                  else if (char === ')') parenCount--;
                }
              }
              
              outputLines.push(...sigLines);
              
              const defIndent = sigLines[0].match(/^([ \t]*)/)?.[0].length || 0;
              const indentStr = sigLines[0].match(/^([ \t]*)/)?.[0] || '';
              
              // Docstring check for class method
              let docstringLines: string[] = [];
              let docstringQuote = '';
              let nextLineIndex = m + 1;
              
              while (nextLineIndex < classLines.length && classLines[nextLineIndex].trim() === '') {
                nextLineIndex++;
              }
              
              if (nextLineIndex < classLines.length) {
                const firstBodyLine = classLines[nextLineIndex].trim();
                if (firstBodyLine.startsWith('"""') || firstBodyLine.startsWith("'''")) {
                  docstringQuote = firstBodyLine.startsWith('"""') ? '"""' : "'''";
                  const restOfLine = firstBodyLine.substring(3);
                  if (restOfLine.includes(docstringQuote)) {
                    docstringLines.push(classLines[nextLineIndex]);
                  } else {
                    docstringLines.push(classLines[nextLineIndex]);
                    for (let n = nextLineIndex + 1; n < classLines.length; n++) {
                      docstringLines.push(classLines[n]);
                      if (classLines[n].includes(docstringQuote)) {
                        nextLineIndex = n;
                        break;
                      }
                    }
                  }
                }
              }
              
              if (docstringLines.length > 0) {
                outputLines.push(...docstringLines);
                m = nextLineIndex;
              }
              
              outputLines.push(`${indentStr}    pass`);
              skipIndentLevel = defIndent;
              k = m;
            } else {
              outputLines.push(l);
            }
          }
          declCode = outputLines.join('\n');
        }

        symbols.push({
          name,
          type,
          start: startChar,
          end: endChar,
          code: symbolCode,
          declCode,
          dependencies
        });
        
        lineIndex = endLine;
        charOffset = startChar + symbolCode.length + 1;
        continue;
      }
    }

    charOffset += lineLength;
  }

  return {
    filePath: absolutePath,
    imports,
    symbols
  };
}
