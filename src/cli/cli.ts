import * as fs from 'fs';
import * as path from 'path';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';

function printHelp() {
  console.log(`
ContextIt: AI Context Compressor CLI

Usage:
  node dist/cli/cli.js --entry <file_path> [options]

Options:
  --entry <path>    Path to the entry file (Required)
  --symbol <name>   Focus only on a specific class or function dependency tree
  --mode <type>     Pruning mode: 'full' or 'decl' (default: 'full')
  --output <path>   Write output to a file instead of stdout
  --help            Show this help menu
`);
}

export function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  let entry: string | undefined;
  let symbol: string | undefined;
  let mode: 'full' | 'decl' = 'full';
  let output: string | undefined;

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
    const resultContext = pruner.prune(resolution, { mode }, entry);

    if (output) {
      fs.writeFileSync(output, resultContext, 'utf-8');
      console.log(`Context compressed successfully and written to ${output}`);
    } else {
      console.log(resultContext);
    }
  } catch (error: any) {
    console.error('An error occurred during context compression:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
