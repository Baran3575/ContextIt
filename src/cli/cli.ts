import * as fs from 'fs';
import * as path from 'path';
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

    // Calculate metrics
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

if (require.main === module) {
  main();
}
