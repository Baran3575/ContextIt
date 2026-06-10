import * as fs from 'fs';
import * as path from 'path';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';
import { runAllBenchmarks } from '../benchmark/realWorld';
import { buildContextIR } from '../parser/ir';

function printHelp() {
  console.log(`
ContextIt: AI Context Compressor CLI

Usage:
  node dist/cli/cli.js compile --entry <file_path> [options]
  node dist/cli/cli.js --entry <file_path> [options]
  node dist/cli/cli.js benchmark

Options:
  --entry <path>    Path to the entry file (Required)
  --symbol <name>   Focus only on a specific class or function dependency tree
  --mode <type>     Pruning mode: 'full' or 'decl' (default: 'full')
  --output <path>   Write output to a file instead of stdout
  --no-metrics      Omit the prepended markdown metrics callout block from the pruned context
  --ir              Output Context IR in JSON format instead of markdown
  --task <desc>     Task description / instruction for Context IR
  --help            Show this help menu
`);
}

function findProjectRoot(entryPath: string): string {
  let dir = path.dirname(path.resolve(entryPath));
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return path.dirname(path.resolve(entryPath));
}

function estimateSymbols(content: string, ext: string): number {
  let count = 0;
  const lines = content.split('\n');
  if (ext === '.py') {
    for (const line of lines) {
      if (/^(def|class)\s+[a-zA-Z_]/.test(line)) {
        count++;
      }
    }
  } else if (ext === '.rs') {
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(pub\s+)?(async\s+)?(fn|struct|enum|trait|impl|type|const|static)\s+[a-zA-Z_]/.test(trimmed)) {
        count++;
      }
    }
  } else {
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(export\s+)?(default\s+)?(function|class|interface|type|const|let|var)\s+[a-zA-Z_]/.test(trimmed)) {
        count++;
      }
    }
  }
  return count;
}

function scanProjectStats(rootDir: string): { files: number; symbols: number; tokens: number } {
  let files = 0;
  let symbols = 0;
  let tokens = 0;

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === 'out' ||
          entry.name === '.gemini' ||
          entry.name === '.agents' ||
          entry.name === 'temp' ||
          entry.name === 'tmp'
        ) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.rs'].includes(ext)) {
          files++;
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            tokens += Math.ceil(content.length / 3.7);
            symbols += estimateSymbols(content, ext);
          } catch (e) {}
        }
      }
    }
  }

  walk(rootDir);
  return { files, symbols, tokens };
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`;
  }
  return tokens.toString();
}

export function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('benchmark') || args.includes('--benchmark')) {
    runAllBenchmarks();
    console.log();
    const { runPassesBenchmark } = require('../benchmark/passes');
    runPassesBenchmark();
    return;
  }

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const isCompileMode = args.includes('compile');
  const cleanArgs = args.filter(a => a !== 'compile');

  let entry: string | undefined;
  let symbol: string | undefined;
  let mode: 'full' | 'decl' = 'full';
  let output: string | undefined;
  let noMetrics = false;
  let irMode = false;
  let taskInstruction = 'Analyze codebase and understand dependencies';

  for (let i = 0; i < cleanArgs.length; i++) {
    if (cleanArgs[i] === '--entry') {
      entry = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--symbol') {
      symbol = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--mode') {
      const parsedMode = cleanArgs[i + 1];
      if (parsedMode === 'full' || parsedMode === 'decl') {
        mode = parsedMode;
      } else {
        console.error(`Error: Invalid mode '${parsedMode}'. Must be 'full' or 'decl'.`);
        process.exit(1);
      }
      i++;
    } else if (cleanArgs[i] === '--output') {
      output = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--no-metrics') {
      noMetrics = true;
    } else if (cleanArgs[i] === '--ir') {
      irMode = true;
    } else if (cleanArgs[i] === '--task') {
      taskInstruction = cleanArgs[i + 1];
      i++;
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

    const projectRoot = findProjectRoot(entry);
    const contextIR = buildContextIR(resolution, entry, symbol || null, taskInstruction, resultContext, projectRoot);

    const outputContent = irMode ? JSON.stringify(contextIR, null, 2) : resultContext;

    if (output) {
      fs.writeFileSync(output, outputContent, 'utf-8');
    } else {
      console.log(outputContent);
    }

    // Determine what stats to print
    if (isCompileMode) {
      const inputStats = scanProjectStats(projectRoot);
      const outputStats = {
        files: contextIR.context_stats.files,
        symbols: contextIR.context_stats.symbols,
        tokens: contextIR.context_stats.tokens
      };
      const reduction = inputStats.tokens > 0 
        ? ((1 - outputStats.tokens / inputStats.tokens) * 100).toFixed(1)
        : '0.0';

      const telemetryOutput = `
Input
------
Files: ${inputStats.files}
Symbols: ${inputStats.symbols}
Tokens: ${formatTokens(inputStats.tokens)}

Output
------
Files: ${outputStats.files}
Symbols: ${outputStats.symbols}
Tokens: ${formatTokens(outputStats.tokens)}

Reduction: ${reduction}%
`.trim();

      if (output) {
        console.log(`Context compiled successfully and written to ${output}`);
        console.log('\n' + telemetryOutput);
      } else {
        console.error('\n' + telemetryOutput);
      }
    } else {
      // Classic mode metrics format
      let rawTotalCharacters = 0;
      for (const filePath of Object.keys(resolution.parsedFiles)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          rawTotalCharacters += content.length;
        } catch (e) {}
      }

      const rawTokens = Math.ceil(rawTotalCharacters / 3.7);
      const prunedTokens = contextIR.context_stats.tokens;
      const reductionRatio = rawTokens / (prunedTokens || 1);
      const COST_PER_TOKEN = 1.50 / 1_000_000;
      const rawCost = (rawTokens * COST_PER_TOKEN).toFixed(5);
      const prunedCost = (prunedTokens * COST_PER_TOKEN).toFixed(5);
      const percentSavings = Math.round((1 - prunedTokens / (rawTokens || 1)) * 100);

      const metricsMsg = `
--- ContextIt Slicing Metrics ---
Raw Context: ~${rawTokens.toLocaleString()} tokens
Pruned Context: ~${prunedTokens.toLocaleString()} tokens (${reductionRatio.toFixed(1)}x reduction)
Estimated Cost Savings: ${percentSavings}% ($${rawCost} -> $${prunedCost})
`.trim();

      if (output) {
        console.log(`Context compressed successfully and written to ${output}`);
        console.log(metricsMsg);
      } else {
        console.error('\n' + metricsMsg);
      }
    }

  } catch (error: any) {
    console.error('An error occurred during context compression:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
