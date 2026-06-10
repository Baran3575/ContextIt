import * as fs from 'fs';
import * as path from 'path';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';
import { runAllBenchmarks } from '../benchmark/realWorld';
import { buildContextIR } from '../parser/ir';

function printHelp() {
  console.log(`
\x1b[36mContextIt: AI Context Compressor CLI (v2.2.1)\x1b[0m

Usage:
  node dist/cli/cli.js compile --entry <file_path> [options]
  node dist/cli/cli.js --entry <file_path> [options]
  node dist/cli/cli.js benchmark

Options:
  -e, --entry <path>    Path to the entry file (Required)
  -s, --symbol <name>   Focus only on a specific class or function dependency tree
  -m, --mode <type>     Pruning mode: 'full' or 'decl' (default: 'full')
  -o, --output <path>   Write output to a file instead of stdout
  -n, --no-metrics      Omit the prepended markdown metrics callout block from the pruned context
  -i, --ir              Output Context IR in JSON format instead of markdown
  -t, --task <desc>     Task description / instruction for Context IR
  --stats               Print a file-by-file token reduction summary table
  -h, --help            Show this help menu
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
    console.log();
    const { runQualitySuiteBenchmark } = require('../benchmark/qualitySuite');
    runQualitySuiteBenchmark();
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
  let statsMode = false;
  let taskInstruction = 'Analyze codebase and understand dependencies';

  for (let i = 0; i < cleanArgs.length; i++) {
    if (cleanArgs[i] === '--entry' || cleanArgs[i] === '-e') {
      entry = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--symbol' || cleanArgs[i] === '-s') {
      symbol = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--mode' || cleanArgs[i] === '-m') {
      const parsedMode = cleanArgs[i + 1];
      if (parsedMode === 'full' || parsedMode === 'decl') {
        mode = parsedMode;
      } else {
        console.error(`\x1b[31mError:\x1b[0m Invalid mode '${parsedMode}'. Must be 'full' or 'decl'.`);
        process.exit(1);
      }
      i++;
    } else if (cleanArgs[i] === '--output' || cleanArgs[i] === '-o') {
      output = cleanArgs[i + 1];
      i++;
    } else if (cleanArgs[i] === '--no-metrics' || cleanArgs[i] === '-n') {
      noMetrics = true;
    } else if (cleanArgs[i] === '--ir' || cleanArgs[i] === '-i') {
      irMode = true;
    } else if (cleanArgs[i] === '--stats') {
      statsMode = true;
    } else if (cleanArgs[i] === '--task' || cleanArgs[i] === '-t') {
      taskInstruction = cleanArgs[i + 1];
      i++;
    }
  }

  if (!entry) {
    console.error('\x1b[31mError:\x1b[0m --entry (-e) option is required.');
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(entry)) {
    console.error(`\x1b[31mError:\x1b[0m Entry file not found: ${entry}`);
    process.exit(1);
  }

  try {
    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(entry, symbol);
    const resultContext = pruner.prune(resolution, { mode, noMetrics, targetSymbol: symbol }, entry);

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
\x1b[36mInput\x1b[0m
------
Files: ${inputStats.files}
Symbols: ${inputStats.symbols}
Tokens: ${formatTokens(inputStats.tokens)}

\x1b[36mOutput\x1b[0m
------
Files: ${outputStats.files}
Symbols: ${outputStats.symbols}
Tokens: \x1b[32m${formatTokens(outputStats.tokens)}\x1b[0m

Reduction: \x1b[32m${reduction}%\x1b[0m
`.trim();

      if (output) {
        console.log(`\x1b[32mContext compiled successfully and written to ${output}\x1b[0m`);
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

      let rawTokens = Math.ceil(rawTotalCharacters / 3.7);
      let prunedTokens = contextIR.context_stats.tokens;
      if (prunedTokens > rawTokens) {
        prunedTokens = rawTokens;
      }
      const reductionRatio = rawTokens / (prunedTokens || 1);
      const COST_PER_TOKEN = 1.50 / 1_000_000;
      const rawCost = (rawTokens * COST_PER_TOKEN).toFixed(5);
      const prunedCost = (prunedTokens * COST_PER_TOKEN).toFixed(5);
      const percentSavings = rawTokens > 0 
        ? Math.max(0, Math.round((1 - prunedTokens / rawTokens) * 100))
        : 0;

      const metricsMsg = `
\x1b[33m--- ContextIt Slicing Metrics ---\x1b[0m
Raw Context: ~${rawTokens.toLocaleString()} tokens
Pruned Context: \x1b[32m~${prunedTokens.toLocaleString()} tokens\x1b[0m (${reductionRatio.toFixed(1)}x reduction)
Estimated Cost Savings: \x1b[32m${percentSavings}%\x1b[0m ($${rawCost} -> $${prunedCost})
`.trim();

      if (output) {
        console.log(`\x1b[32mContext compressed successfully and written to ${output}\x1b[0m`);
        if (!noMetrics) {
          console.log(metricsMsg);
        }
      } else {
        if (!noMetrics) {
          console.error('\n' + metricsMsg);
        }
      }

      // Print Summary Table if statsMode is set
      if (statsMode) {
        console.error('\n\x1b[36m=== File-by-File Slicing Summary ===\x1b[0m');
        const header = '| File Path | Raw (Tokens) | Pruned (Tokens) | Reduction |';
        const divider = '|-----------|--------------|-----------------|-----------|';
        console.error(header);
        console.error(divider);
        
        for (const filePath of Object.keys(resolution.parsedFiles)) {
          const relativePath = path.relative(process.cwd(), filePath);
          let rawSize = 0;
          try {
            rawSize = fs.readFileSync(filePath, 'utf-8').length;
          } catch(e) {}
          
          let prunedSize = 0;
          const escapedPath = relativePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const fileBlockRegex = new RegExp(`## File: \`\\x1b*\\x07*${escapedPath}\`\\r?\\n\`\`\`[a-z]*\\r?\\n([\\s\\S]*?)\`\`\`\\r?\\n\\r?\\n`, 'i');
          const match = resultContext.match(fileBlockRegex);
          if (match) {
            prunedSize = match[1].length;
          }
          
          const rawTok = Math.ceil(rawSize / 3.7);
          const prunedTok = Math.ceil(prunedSize / 3.7);
          const ratio = prunedTok > 0 ? (rawTok / prunedTok).toFixed(1) + 'x' : '1.0x';
          const coloredRatio = prunedTok < rawTok ? `\x1b[32m${ratio}\x1b[0m` : `\x1b[33m${ratio}\x1b[0m`;
          console.error(`| ${relativePath} | ${rawTok.toLocaleString()} | ${prunedTok.toLocaleString()} | ${coloredRatio} |`);
        }
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
