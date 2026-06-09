import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'other';
  start: number;
  end: number;
  code: string;
  dependencies: string[]; // local symbols referenced inside this symbol
}

export interface ImportInfo {
  source: string; // e.g. "./utils"
  resolvedPath: string; // e.g. "/path/to/utils.ts"
  specifiers: string[]; // e.g. ["formatDate"] or ["default"]
}

export interface FileDependencies {
  filePath: string;
  imports: ImportInfo[];
  symbols: SymbolInfo[];
}

/**
 * Resolves the absolute path of an import source relative to the importing file.
 */
export function resolveImportPath(importingFilePath: string, source: string): string | null {
  if (!source.startsWith('.') && !source.startsWith('/')) {
    // It's a node_module dependency or external library, skip for local tracing
    return null;
  }

  const dir = path.dirname(importingFilePath);
  const potentialPaths = [
    path.resolve(dir, source),
    path.resolve(dir, source + '.ts'),
    path.resolve(dir, source + '.tsx'),
    path.resolve(dir, source + '.d.ts'),
    path.resolve(dir, source + '.js'),
    path.resolve(dir, source + '.jsx'),
    path.resolve(dir, path.join(source, 'index.ts')),
    path.resolve(dir, path.join(source, 'index.tsx')),
    path.resolve(dir, path.join(source, 'index.js')),
  ];

  for (const p of potentialPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

/**
 * Parses a TS/JS file and extracts its imports and top-level symbols (with their dependencies).
 */
export function parseTSFile(filePath: string): FileDependencies {
  const code = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );

  const imports: ImportInfo[] = [];
  const symbols: SymbolInfo[] = [];

  // Helper to extract identifiers used within a node (for dependency resolution)
  function getReferencedIdentifiers(node: ts.Node): string[] {
    const refs = new Set<string>();
    function visit(child: ts.Node) {
      if (ts.isIdentifier(child)) {
        // Exclude the name of the declaration itself
        refs.add(child.text);
      }
      ts.forEachChild(child, visit);
    }
    // Start visiting from children to avoid adding the declaration's own name
    ts.forEachChild(node, visit);
    return Array.from(refs);
  }

  function getSymbolType(node: ts.Node): SymbolInfo['type'] {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      return 'function';
    }
    if (ts.isClassDeclaration(node)) {
      return 'class';
    }
    if (ts.isInterfaceDeclaration(node)) {
      return 'interface';
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return 'type';
    }
    if (ts.isVariableDeclaration(node) || ts.isVariableStatement(node)) {
      return 'variable';
    }
    return 'other';
  }

  function addSymbol(name: string, node: ts.Node) {
    const type = getSymbolType(node);
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const symbolCode = code.substring(start, end);
    const dependencies = getReferencedIdentifiers(node).filter(dep => dep !== name);

    symbols.push({
      name,
      type,
      start,
      end,
      code: symbolCode,
      dependencies,
    });
  }

  // Traverse the AST at the top level
  sourceFile.statements.forEach(statement => {
    // 1. Process Imports
    if (ts.isImportDeclaration(statement)) {
      const source = (statement.moduleSpecifier as ts.StringLiteral).text;
      const resolvedPath = resolveImportPath(filePath, source);

      const specifiers: string[] = [];
      if (statement.importClause) {
        if (statement.importClause.name) {
          specifiers.push('default');
        }
        if (statement.importClause.namedBindings) {
          if (ts.isNamedImports(statement.importClause.namedBindings)) {
            statement.importClause.namedBindings.elements.forEach(el => {
              specifiers.push(el.name.text);
            });
          } else if (ts.isNamespaceImport(statement.importClause.namedBindings)) {
            specifiers.push('*');
          }
        }
      }

      if (resolvedPath) {
        imports.push({ source, resolvedPath, specifiers });
      }
    }

    // 2. Process Exported/Top-level Declarations
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      addSymbol(statement.name.text, statement);
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      addSymbol(statement.name.text, statement);
    } else if (ts.isInterfaceDeclaration(statement) && statement.name) {
      addSymbol(statement.name.text, statement);
    } else if (ts.isTypeAliasDeclaration(statement) && statement.name) {
      addSymbol(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          addSymbol(decl.name.text, decl);
        }
      });
    }
  });

  return {
    filePath,
    imports,
    symbols,
  };
}
