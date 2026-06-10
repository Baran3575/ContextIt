import * as path from 'path';
import * as fs from 'fs';
import { DependencyResolver } from '../src/parser/resolver';
import { CodePruner, stripFunctionBody, stripComments } from '../src/pruner/pruner';
import { resolveImportPath, parseTSFile } from '../src/parser/tsParser';
import { parsePythonFile } from '../src/parser/pyParser';
import { parseRustFile } from '../src/parser/rsParser';

describe('ContextIt - Comprehensive Test Suite (10+ Tests)', () => {
  const mainFixturePath = path.resolve(__dirname, 'fixtures/main.ts');
  const utilsFixturePath = path.resolve(__dirname, 'fixtures/utils.ts');
  const dbFixturePath = path.resolve(__dirname, 'fixtures/db.ts');

  // Test 1: Function body stripping for standard function declarations
  test('1. stripFunctionBody - standard function declaration', () => {
    const fnCode = 'export function add(a: number, b: number): number {\n  return a + b;\n}';
    const result = stripFunctionBody(fnCode);
    expect(result).toBe('export function add(a: number, b: number): number;');
  });

  // Test 2: Function body stripping for arrow functions
  test('2. stripFunctionBody - arrow function assignment', () => {
    const arrowFnCode = 'export const multiply = (a: number, b: number): number => {\n  return a * b;\n}';
    const result = stripFunctionBody(arrowFnCode);
    expect(result).toBe('export const multiply = (a: number, b: number): number;');
  });

  // Test 3: Function body stripping with multi-line signatures
  test('3. stripFunctionBody - multi-line signature', () => {
    const multiLineFn = 'function complex(\n  x: string,\n  y: number\n): boolean {\n  return true;\n}';
    const result = stripFunctionBody(multiLineFn);
    expect(result).toBe('function complex(\n  x: string,\n  y: number\n): boolean;');
  });

  // Test 4: Comment stripping for single-line comments
  test('4. stripComments - single line comments', () => {
    const code = 'const x = 5;\n// another comment\nconst y = 10;';
    const result = stripComments(code);
    expect(result).toContain('const x = 5;');
    expect(result).toContain('const y = 10;');
    expect(result).not.toContain('// another comment');
  });

  // Test 5: Comment stripping preserving JSDoc comments
  test('5. stripComments - preserve JSDoc comments', () => {
    const code = '/**\n * JSDoc description\n */\nexport function test() {}';
    const result = stripComments(code);
    expect(result).toContain('/**');
    expect(result).toContain(' * JSDoc description');
    expect(result).toContain(' */');
    expect(result).toContain('export function test() {}');
  });

  // Test 6: Import path resolution for existing files
  test('6. resolveImportPath - relative path resolution', () => {
    const resolved = resolveImportPath(mainFixturePath, './utils');
    expect(resolved).toBe(utilsFixturePath);
  });

  // Test 7: Import path resolution for non-existing files/packages
  test('7. resolveImportPath - external/missing paths', () => {
    const resolved = resolveImportPath(mainFixturePath, 'fs');
    expect(resolved).toBeNull();
  });

  // Test 8: Parser symbol extraction
  test('8. parseTSFile - symbol count and types', () => {
    const fileDeps = parseTSFile(utilsFixturePath);
    expect(fileDeps.symbols.length).toBeGreaterThanOrEqual(2);
    
    const hashFn = fileDeps.symbols.find(s => s.name === 'hashPassword');
    expect(hashFn).toBeDefined();
    expect(hashFn!.type).toBe('function');
  });

  // Test 9: Resolver dependency tracing
  test('9. DependencyResolver - target symbol tracing', () => {
    const resolver = new DependencyResolver();
    const resolution = resolver.resolve(mainFixturePath, 'registerUser');
    
    expect(resolution.filesToSymbols[mainFixturePath].has('registerUser')).toBe(true);
    expect(resolution.filesToSymbols[utilsFixturePath].has('hashPassword')).toBe(true);
    expect(resolution.filesToSymbols[dbFixturePath].has('User')).toBe(true);
  });

  // Test 10: Resolver circular dependencies check
  test('10. DependencyResolver - circular dependencies handle', () => {
    // Create circular dependency fixtures temporarily
    const fileA = path.join(__dirname, 'fixtures/circularA.ts');
    const fileB = path.join(__dirname, 'fixtures/circularB.ts');

    fs.writeFileSync(fileA, "import { b } from './circularB';\nexport function a() { b(); }", 'utf-8');
    fs.writeFileSync(fileB, "import { a } from './circularA';\nexport function b() { a(); }", 'utf-8');

    const resolver = new DependencyResolver();
    // Resolving should not throw Infinite Loop / Call Stack Size Exceeded errors
    expect(() => resolver.resolve(fileA, 'a')).not.toThrow();

    const resolution = resolver.resolve(fileA, 'a');
    expect(resolution.filesToSymbols[fileA].has('a')).toBe(true);
    expect(resolution.filesToSymbols[fileB].has('b')).toBe(true);

    // Clean up circular fixtures
    fs.unlinkSync(fileA);
    fs.unlinkSync(fileB);
  });

  // Test 11: CodePruner output verification (Full Mode)
  test('11. CodePruner - verify pruned content output structure', () => {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();
    const resolution = resolver.resolve(mainFixturePath, 'registerUser');
    const result = pruner.prune(resolution, { mode: 'full' }, mainFixturePath);

    expect(result).toContain('File:');
    expect(result).toContain('```typescript');
    expect(result).toContain('registerUser');
    expect(result).toContain('hashPassword');
    expect(result).not.toContain('unusedMain');
  });

  // Test 12: CodePruner import pruning verification
  test('12. CodePruner - verify unused import specifier pruning', () => {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();
    
    // Set up a mock dependency resolution where only some imports are used
    const resolution = resolver.resolve(mainFixturePath, 'registerUser');
    const result = pruner.prune(resolution, { mode: 'full' }, mainFixturePath);
    
    // Should import hashPassword, but should not import any unused symbols
    expect(result).toContain("import { hashPassword } from './utils'");
    expect(result).not.toContain('unusedUtil');
  });

  // Test 13: CommonJS require parser support
  test('13. parseTSFile - CommonJS require parsing', () => {
    const tempJSFile = path.join(__dirname, 'fixtures/commonjs_temp.js');
    fs.writeFileSync(tempJSFile, "const utils = require('./utils');\nconst { hashPassword } = require('./utils');\n", 'utf-8');

    try {
      const parsed = parseTSFile(tempJSFile);
      expect(parsed.imports.length).toBe(2);
      expect(parsed.imports[0].source).toBe('./utils');
      expect(parsed.imports[0].specifiers).toContainEqual({ localName: 'utils', exportName: '*' });
      expect(parsed.imports[1].specifiers).toContainEqual({ localName: 'hashPassword', exportName: 'hashPassword' });
    } finally {
      fs.unlinkSync(tempJSFile);
    }
  });

  // Test 14: Python AST parser support
  test('14. parsePythonFile - Python parsing', () => {
    const tempPyFile = path.join(__dirname, 'fixtures/py_temp.py');
    fs.writeFileSync(tempPyFile, "import os\nfrom .utils import check_auth\n\ndef my_func(x):\n    print(check_auth())\n    return x + 1\n", 'utf-8');

    try {
      const parsed = parsePythonFile(tempPyFile);
      // It should resolve .utils since utils.ts/utils.js exists in fixtures (though it might not resolve to .py, but the resolving logic is tested)
      expect(parsed.symbols.length).toBe(1);
      expect(parsed.symbols[0].name).toBe('my_func');
      expect(parsed.symbols[0].type).toBe('function');
      expect(parsed.symbols[0].dependencies).toContain('check_auth');
    } finally {
      fs.unlinkSync(tempPyFile);
    }
  });

  // Test 15: Rust parser support
  test('15. parseRustFile - Rust parsing', () => {
    const tempRsFile = path.join(__dirname, 'fixtures/rs_temp.rs');
    const tempUtilsFile = path.join(__dirname, 'fixtures/utils.rs');
    const tempDbFile = path.join(__dirname, 'fixtures/db.rs');

    fs.writeFileSync(tempRsFile, "use crate::utils::hash;\nmod db;\n\npub fn run_query() {\n    let val = hash();\n}\n", 'utf-8');
    fs.writeFileSync(tempUtilsFile, "pub fn hash() {}", 'utf-8');
    fs.writeFileSync(tempDbFile, "", 'utf-8');

    try {
      const parsed = parseRustFile(tempRsFile);
      expect(parsed.imports.length).toBeGreaterThanOrEqual(1);
      expect(parsed.symbols.length).toBe(1);
      expect(parsed.symbols[0].name).toBe('run_query');
      expect(parsed.symbols[0].type).toBe('function');
      expect(parsed.symbols[0].dependencies).toContain('hash');
    } finally {
      fs.unlinkSync(tempRsFile);
      fs.unlinkSync(tempUtilsFile);
      fs.unlinkSync(tempDbFile);
    }
  });

  // Test 16: Python top-level assignments and annotations
  test('16. parsePythonFile - top level assignments and annotations', () => {
    const tempPyFile = path.join(__dirname, 'fixtures/py_assign_temp.py');
    fs.writeFileSync(tempPyFile, "DB_HOST = 'localhost'\nPORT: int = 5432\n\ndef run():\n    print(DB_HOST)\n", 'utf-8');

    try {
      const parsed = parsePythonFile(tempPyFile);
      const dbHost = parsed.symbols.find(s => s.name === 'DB_HOST');
      const port = parsed.symbols.find(s => s.name === 'PORT');
      const run = parsed.symbols.find(s => s.name === 'run');

      expect(dbHost).toBeDefined();
      expect(port).toBeDefined();
      expect(run).toBeDefined();
      expect(run!.dependencies).toContain('DB_HOST');
    } finally {
      fs.unlinkSync(tempPyFile);
    }
  });

  // Test 17: Rust trait impl and macro rules
  test('17. parseRustFile - trait impl and macro rules', () => {
    const tempRsFile = path.join(__dirname, 'fixtures/rs_adv_temp.rs');
    fs.writeFileSync(tempRsFile, "macro_rules! my_macro {\n    () => {};\n}\nimpl MyTrait for MyStruct {\n    fn bar() {}\n}\n", 'utf-8');

    try {
      const parsed = parseRustFile(tempRsFile);
      const myMacro = parsed.symbols.find(s => s.name === 'my_macro');
      const myStructImpl = parsed.symbols.find(s => s.name === 'MyStruct');
      const myTraitImpl = parsed.symbols.find(s => s.name === 'MyTrait');

      expect(myMacro).toBeDefined();
      expect(myStructImpl).toBeDefined();
      expect(myTraitImpl).toBeDefined();
    } finally {
      fs.unlinkSync(tempRsFile);
    }
  });

  // Test 18: Python function body stripping
  test('18. stripPythonFunctionBody - python decl mode', () => {
    const pyCode = "def complex_func(a, b):\n    print('something')\n    return a + b";
    const { stripPythonFunctionBody } = require('../src/pruner/pruner');
    const result = stripPythonFunctionBody(pyCode);
    expect(result).toBe("def complex_func(a, b):\n    pass");
  });

  // Test 19: TS class method body stripping
  test('19. cleanTSNodeForDecl - class method stripping', () => {
    const { cleanTSNodeForDecl } = require('../src/parser/tsParser');
    const ts = require('typescript');
    const code = "class Test { constructor(x: number) { this.x = x; } getVal() { return 1; } }";
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const classNode = sourceFile.statements[0];
    const result = cleanTSNodeForDecl(classNode, sourceFile);
    expect(result).toContain("constructor(x: number);");
    expect(result).toContain("getVal();");
    expect(result).not.toContain("this.x = x;");
    expect(result).not.toContain("return 1;");
  });

  // Test 20: Rust impl method body stripping
  test('20. parseRustFile - impl method stripping', () => {
    const { parseRustFile } = require('../src/parser/rsParser');
    const fs = require('fs');
    const tempFile = path.join(__dirname, 'fixtures/rs_impl_temp.rs');
    fs.writeFileSync(tempFile, "impl MyStruct {\n    pub fn get_val(&self) -> i32 {\n        123\n    }\n}\n", 'utf-8');

    try {
      const parsed = parseRustFile(tempFile);
      const myStruct = parsed.symbols.find((s: any) => s.name === 'MyStruct');
      expect(myStruct).toBeDefined();
      expect(myStruct!.declCode).toContain("pub fn get_val(&self) -> i32 { }");
      expect(myStruct!.declCode).not.toContain("123");
    } finally {
      fs.unlinkSync(tempFile);
    }
  });

  // Test 21: Resolver scale dependency resolution (50-file chain)
  test('21. DependencyResolver - 50-file scale recursive import resolution', () => {
    const scaleTempDir = path.join(__dirname, 'fixtures/scale_test_temp');
    if (!fs.existsSync(scaleTempDir)) {
      fs.mkdirSync(scaleTempDir);
    }

    try {
      // Create 50 files where each file imports the previous one
      fs.writeFileSync(path.join(scaleTempDir, 'utils_1.ts'), "export function usedHelper_1(v: number) { return v; }\nexport function unused() {}", 'utf-8');
      for (let i = 2; i <= 50; i++) {
        fs.writeFileSync(
          path.join(scaleTempDir, `utils_${i}.ts`),
          `import { usedHelper_${i - 1} } from './utils_${i - 1}';\nexport function usedHelper_${i}(v: number) { return usedHelper_${i - 1}(v) + 1; }\nexport function unused() {}`,
          'utf-8'
        );
      }
      const entryFile = path.join(scaleTempDir, 'main.ts');
      fs.writeFileSync(entryFile, `import { usedHelper_50 } from './utils_50';\nexport function run(v: number) { return usedHelper_50(v); }`, 'utf-8');

      const resolver = new DependencyResolver();
      const resolution = resolver.resolve(entryFile, 'run');

      // Verify that all 50 helper functions are resolved and included
      expect(Object.keys(resolution.filesToSymbols).length).toBe(51); // 50 utils + 1 main
      expect(resolution.filesToSymbols[path.join(scaleTempDir, 'utils_1.ts')].has('usedHelper_1')).toBe(true);
      expect(resolution.filesToSymbols[path.join(scaleTempDir, 'utils_1.ts')].has('unused')).toBe(false);
      expect(resolution.filesToSymbols[path.join(scaleTempDir, 'utils_50.ts')].has('usedHelper_50')).toBe(true);
      expect(resolution.filesToSymbols[path.join(scaleTempDir, 'utils_50.ts')].has('unused')).toBe(false);
    } finally {
      // Cleanup
      if (fs.existsSync(scaleTempDir)) {
        fs.rmSync(scaleTempDir, { recursive: true, force: true });
      }
    }
  });

  // Test 22: Namespace and renamed default imports resolution
  test('22. DependencyResolver & CodePruner - Namespaces and Renamed Defaults', () => {
    const tempDir = path.join(__dirname, 'fixtures/ns_test_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    try {
      const utilsFile = path.join(tempDir, 'utils.ts');
      fs.writeFileSync(
        utilsFile,
        "export default function defaultHelper() { return 'default'; }\n" +
        "export function hashPassword() { return 'hash'; }\n" +
        "export function unusedUtil() { return 'unused'; }\n",
        'utf-8'
      );

      const mainFile = path.join(tempDir, 'main.ts');
      fs.writeFileSync(
        mainFile,
        "import myDefault, { hashPassword as hp } from './utils';\n" +
        "export function run() {\n" +
        "  myDefault();\n" +
        "  hp();\n" +
        "}\n",
        'utf-8'
      );

      const mainNSFile = path.join(tempDir, 'mainNS.ts');
      fs.writeFileSync(
        mainNSFile,
        "import * as ns from './utils';\n" +
        "export function runNS() {\n" +
        "  ns.hashPassword();\n" +
        "}\n",
        'utf-8'
      );

      const resolver = new DependencyResolver();
      const pruner = new CodePruner();

      // Test 1: Renamed default and alias named import
      const res1 = resolver.resolve(mainFile, 'run');
      expect(res1.filesToSymbols[utilsFile]).toBeDefined();
      expect(res1.filesToSymbols[utilsFile].has('default')).toBe(true);
      expect(res1.filesToSymbols[utilsFile].has('hashPassword')).toBe(true);
      expect(res1.filesToSymbols[utilsFile].has('unusedUtil')).toBe(false);

      const prune1 = pruner.prune(res1, { mode: 'full' }, mainFile);
      expect(prune1).toContain("import myDefault, { hashPassword as hp } from './utils'");

      // Test 2: Namespace property access
      const res2 = resolver.resolve(mainNSFile, 'runNS');
      expect(res2.filesToSymbols[utilsFile]).toBeDefined();
      expect(res2.filesToSymbols[utilsFile].has('hashPassword')).toBe(true);
      expect(res2.filesToSymbols[utilsFile].has('default')).toBe(false);
      expect(res2.filesToSymbols[utilsFile].has('unusedUtil')).toBe(false);

      const prune2 = pruner.prune(res2, { mode: 'full' }, mainNSFile);
      expect(prune2).toContain("import * as ns from './utils'");
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  // Test 23: Python attribute dependency and renamed import resolution
  test('23. DependencyResolver & CodePruner - Python Attributes and Renamed Imports', () => {
    const tempDir = path.join(__dirname, 'fixtures/py_ns_test_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    try {
      const utilsFile = path.join(tempDir, 'utils.py');
      fs.writeFileSync(
        utilsFile,
        "def hash_password():\n" +
        "    return 'hash'\n" +
        "\n" +
        "def unused_helper():\n" +
        "    return 'unused'\n",
        'utf-8'
      );

      const mainFile = path.join(tempDir, 'main.py');
      fs.writeFileSync(
        mainFile,
        "from .utils import hash_password as hp\n" +
        "def run():\n" +
        "    return hp()\n",
        'utf-8'
      );

      const mainNSFile = path.join(tempDir, 'main_ns.py');
      fs.writeFileSync(
        mainNSFile,
        "import utils as u\n" +
        "def run_ns():\n" +
        "    return u.hash_password()\n",
        'utf-8'
      );

      const resolver = new DependencyResolver();
      const pruner = new CodePruner();

      // Test 1: Python renamed named import
      const res1 = resolver.resolve(mainFile, 'run');
      expect(res1.filesToSymbols[utilsFile]).toBeDefined();
      expect(res1.filesToSymbols[utilsFile].has('hash_password')).toBe(true);
      expect(res1.filesToSymbols[utilsFile].has('unused_helper')).toBe(false);

      const prune1 = pruner.prune(res1, { mode: 'full' }, mainFile);
      expect(prune1).toContain("from .utils import hash_password as hp");

      // Test 2: Python namespace attribute access
      const res2 = resolver.resolve(mainNSFile, 'run_ns');
      expect(res2.filesToSymbols[utilsFile]).toBeDefined();
      expect(res2.filesToSymbols[utilsFile].has('hash_password')).toBe(true);
      expect(res2.filesToSymbols[utilsFile].has('unused_helper')).toBe(false);

      const prune2 = pruner.prune(res2, { mode: 'full' }, mainNSFile);
      expect(prune2).toContain("from . import utils as u");
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  // Test 24: Rust imports and wildcard module imports
  test('24. DependencyResolver & CodePruner - Rust Imports and Modules', () => {
    const tempDir = path.join(__dirname, 'fixtures/rs_ns_test_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    try {
      const utilsFile = path.join(tempDir, 'utils.rs');
      fs.writeFileSync(
        utilsFile,
        "pub fn hash_password() -> String { String::from(\"hash\") }\n" +
        "pub fn unused_helper() {}\n",
        'utf-8'
      );

      const mainFile = path.join(tempDir, 'main.rs');
      fs.writeFileSync(
        mainFile,
        "use utils::hash_password;\n" +
        "pub fn run() {\n" +
        "    hash_password();\n" +
        "}\n",
        'utf-8'
      );

      const mainModFile = path.join(tempDir, 'main_mod.rs');
      fs.writeFileSync(
        mainModFile,
        "mod utils;\n" +
        "pub fn run_mod() {\n" +
        "    utils::hash_password();\n" +
        "}\n",
        'utf-8'
      );

      const resolver = new DependencyResolver();
      const pruner = new CodePruner();

      // Test 1: Rust use import
      const res1 = resolver.resolve(mainFile, 'run');
      expect(res1.filesToSymbols[utilsFile]).toBeDefined();
      expect(res1.filesToSymbols[utilsFile].has('hash_password')).toBe(true);
      expect(res1.filesToSymbols[utilsFile].has('unused_helper')).toBe(false);

      const prune1 = pruner.prune(res1, { mode: 'full' }, mainFile);
      expect(prune1).toContain("use utils::hash_password;");

      // Test 2: Rust mod declaration
      const res2 = resolver.resolve(mainModFile, 'run_mod');
      expect(res2.filesToSymbols[utilsFile]).toBeDefined();
      expect(res2.filesToSymbols[utilsFile].has('hash_password')).toBe(true);
      expect(res2.filesToSymbols[utilsFile].has('unused_helper')).toBe(false);

      const prune2 = pruner.prune(res2, { mode: 'full' }, mainModFile);
      expect(prune2).toContain("mod utils;");
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  // Test 25: Python nested attributes and namespace import resolution
  test('25. DependencyResolver & pyParser - Python Nested Attributes and Multi-level Imports', () => {
    const tempDir = path.join(__dirname, 'fixtures/py_nested_test_temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    try {
      const mathFile = path.join(tempDir, 'math.py');
      fs.writeFileSync(
        mathFile,
        "def add_numbers(a, b):\n" +
        "    return a + b\n" +
        "\n" +
        "def unused_math():\n" +
        "    pass\n",
        'utf-8'
      );

      const mainFile = path.join(tempDir, 'main.py');
      fs.writeFileSync(
        mainFile,
        "from . import math as my_math\n" +
        "CONFIG = {'database': {'host': 'localhost'}}\n" +
        "\n" +
        "def run():\n" +
        "    print(CONFIG['database']['host'])\n" +
        "    return my_math.add_numbers(1, 2)\n",
        'utf-8'
      );

      const resolver = new DependencyResolver();
      const res = resolver.resolve(mainFile, 'run');
      
      expect(res.filesToSymbols[mainFile].has('CONFIG')).toBe(true);
      expect(res.filesToSymbols[mathFile]).toBeDefined();
      expect(res.filesToSymbols[mathFile].has('add_numbers')).toBe(true);
      expect(res.filesToSymbols[mathFile].has('unused_math')).toBe(false);
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
