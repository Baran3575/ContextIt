# ContextIt: Compressed Project Context

> [!NOTE]
> **Context Slicing & Cost Reduction Metrics (Est.)**:
> - **Raw Context Size**: ~22,278 tokens
> - **Pruned Context Size**: ~2,592 tokens (**8.6x reduction**)
> - **Gemini 3.5 Flash Cost**: $0.03342 &rarr; $0.00389 (**88% savings**)

## File: `src/benchmark/realWorld.ts`
```typescript
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';

function estimateTokens(text: string): number;

COST_PER_TOKEN = 1.50 / 1_000_000

function formatCost(tokens: number): string;

function cleanDirectory(dir: string);

function getAllSourceFiles(dir: string): string[];

interface BenchmarkResult {
  repoName: string;
  targetSymbol: string;
  rawFilesCount: number;
  rawTokens: number;
  rawCost: string;
  prunedFilesCount: number;
  prunedTokens: number;
  prunedCost: string;
  reduction: string;
}

export function runAllBenchmarks();

```

## File: `src/parser/pyParser.ts`
```typescript
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

/**
 * Resolves local python import paths.
 */
export function resolvePyImportPath(importingFilePath: string, source: string): string | null;

/**
 * Parses a Python file by calling the python3 ast parser script.
 */
export function parsePythonFile(filePath: string): FileDependencies;

```

## File: `src/parser/resolver.ts`
```typescript
import { parseTSFile, FileDependencies, SymbolInfo, ImportInfo } from './tsParser';
import { parsePythonFile } from './pyParser';
import { parseRustFile } from './rsParser';

export interface PrunedContextResult {
  filesToSymbols: Record<string, Set<string>>;
  parsedFiles: Record<string, FileDependencies>;
}

export class DependencyResolver {
    private parsedFiles: Record<string, FileDependencies> = {};
    private getOrParseFile(filePath: string): FileDependencies;
    /**
     * Resolves recursive dependencies starting from an entry file and optional target symbol.
     */
    public resolve(entryFile: string, targetSymbol?: string): PrunedContextResult;
    /**
     * Finds which import declaration in the file brings in the given symbol.
     */
    private findImportForSymbol(fileDeps: FileDependencies, symbolName: string): {
        import: ImportInfo;
        specifier: any;
    } | null;
}

```

## File: `src/parser/rsParser.ts`
```typescript
import { FileDependencies, SymbolInfo, ImportInfo } from './tsParser';

/**
 * Resolves local Rust module paths.
 * Supports standard module layouts as well as submodule directories.
 */
export function resolveRustImportPath(importingFilePath: string, source: string): string | null;

/**
 * Helper to strip the body of a Rust function.
 */
function stripRustFunctionBody(code: string): string;

/**
 * Helper to strip method bodies from Rust impl blocks, replacing them with empty braces.
 */
function stripRustImplBodies(code: string): string;

/**
 * A robust Rust parser using regex, keyword scanning, and brace/paren/bracket matching.
 * Extracts imports (use, mod) and symbols (fn, struct, enum, trait, impl, type, const, static, macro_rules!).
 */
export function parseRustFile(filePath: string): FileDependencies;

```

## File: `src/parser/tsParser.ts`
```typescript
export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'other';
  start: number;
  end: number;
  code: string;
  declCode?: string;
  dependencies: string[]; // local symbols referenced inside this symbol
}

export interface ImportSpecifierInfo {
  localName: string;
  exportName: string; // "default" for default imports, "*" for namespace imports, or the actual export name
}

export interface ImportInfo {
  source: string; // e.g. "./utils"
  resolvedPath: string; // e.g. "/path/to/utils.ts"
  specifiers: ImportSpecifierInfo[];
}

export interface FileDependencies {
  filePath: string;
  imports: ImportInfo[];
  symbols: SymbolInfo[];
}

/**
 * Resolves the absolute path of an import source relative to the importing file.
 */
export function resolveImportPath(importingFilePath: string, source: string): string | null;

/**
 * Uses TypeScript transformation API to strip bodies from function, method, constructor,
 * and accessor declarations, returning the declaration-only code.
 */
export function cleanTSNodeForDecl(node: ts.Node, sourceFile: ts.SourceFile): string;

/**
 * Parses a TS/JS file and extracts its imports and top-level symbols (with their dependencies).
 */
export function parseTSFile(filePath: string): FileDependencies;

```

## File: `src/pruner/pruner.ts`
```typescript
import { PrunedContextResult } from '../parser/resolver';
import { SymbolInfo, ImportInfo } from '../parser/tsParser';

export interface PruneOptions {
  mode: 'full' | 'decl';
  noMetrics?: boolean;
}

/**
 * Strips the function body of a function signature, leaving only the declaration.
 * e.g., "export function greet(name: string): string { return `Hello ${name}`; }"
 * becomes "export function greet(name: string): string;"
 */
export function stripFunctionBody(code: string): string;

/**
 * Strips the function body of a Python function, leaving only the signature and a pass statement.
 */
export function stripPythonFunctionBody(code: string): string;

/**
 * Calculates the relative Dotted module path for Python imports.
 */
export function getPythonRelativeModule(fromFile: string, toFile: string): string;

/**
 * Strips single-line comments that are not JSDoc or configuration.
 */
export function stripComments(code: string, lang?: string): string;

export class CodePruner {
    /**
     * Prunes the resolved files and returns a single formatted markdown context string.
     */
    public prune(result: PrunedContextResult, options: PruneOptions, entryFile: string): string;
}

```

## File: `src/cli/cli.ts`
```typescript
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';
import { runAllBenchmarks } from '../benchmark/realWorld';

function printHelp() {
  console.log(`
ContextIt: AI Context Compressor CLI

Usage:
  node dist/cli/cli.js --entry <file_path> [options]
  node dist/cli/cli.js benchmark

Options:
  --entry <path>    Path to the entry file (Required)
  --symbol <name>   Focus only on a specific class or function dependency tree
  --mode <type>     Pruning mode: 'full' or 'decl' (default: 'full')
  --output <path>   Write output to a file instead of stdout
  --no-metrics      Omit the prepended markdown metrics callout block from the pruned context
  --help            Show this help menu
`);
}

export function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('benchmark') || args.includes('--benchmark')) {
    runAllBenchmarks();
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  let entry: string | undefined;
  let symbol: string | undefined;
  let mode: 'full' | 'decl' = 'full';
  let output: string | undefined;
  let noMetrics = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--entry') {
      entry = args[i + 1];
      i++;
    } else if (args[i] === '--symbol') {
      symbol = args[i + 1];
      i++;
    } else if (args[i] === '--mode') {
      const parsedMode = args[i + 1];
      if (parsedMode === 'full' || parsedMode === 'decl') {
        mode = parsedMode;
      } else {
        console.error(`Error: Invalid mode '${parsedMode}'. Must be 'full' or 'decl'.`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--output') {
      output = args[i + 1];
      i++;
    } else if (args[i] === '--no-metrics') {
      noMetrics = true;
    }
  }

  if (!entry) {
    console.error('Error: --entry option is required.');
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(entry)) {
    console.error(`Error: Entry file not found: ${entry}`);
    process.exit(1);
  }

  try {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(entry, symbol);
    const resultContext = pruner.prune(resolution, { mode, noMetrics }, entry);

    let rawTotalCharacters = 0;
    for (const filePath of Object.keys(resolution.parsedFiles)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        rawTotalCharacters += content.length;
      } catch (e) {}
    }

    const rawTokens = Math.ceil(rawTotalCharacters / 3.7);
    const prunedTokens = Math.ceil(resultContext.length / 3.7);
    const reductionRatio = rawTokens / (prunedTokens || 1);
    const COST_PER_TOKEN = 1.50 / 1_000_000;
    const rawCost = (rawTokens * COST_PER_TOKEN).toFixed(5);
    const prunedCost = (prunedTokens * COST_PER_TOKEN).toFixed(5);
    const percentSavings = Math.round((1 - prunedTokens / (rawTokens || 1)) * 100);

    if (output) {
      fs.writeFileSync(output, resultContext, 'utf-8');
      console.log(`Context compressed successfully and written to ${output}`);
      console.log(`Raw Context: ~${rawTokens.toLocaleString()} tokens`);
      console.log(`Pruned Context: ~${prunedTokens.toLocaleString()} tokens (${reductionRatio.toFixed(1)}x reduction)`);
      console.log(`Estimated Cost Savings: ${percentSavings}% ($${rawCost} -> $${prunedCost})`);
    } else {
      console.log(resultContext);
      console.error(`\n--- ContextIt Slicing Metrics ---`);
      console.error(`Raw Context: ~${rawTokens.toLocaleString()} tokens`);
      console.error(`Pruned Context: ~${prunedTokens.toLocaleString()} tokens (${reductionRatio.toFixed(1)}x reduction)`);
      console.error(`Estimated Cost Savings: ${percentSavings}% ($${rawCost} -> $${prunedCost})`);
    }
  } catch (error: any) {
    console.error('An error occurred during context compression:', error.message || error);
    process.exit(1);
  }
}

```

