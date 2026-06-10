import * as fs from 'fs';
import * as path from 'path';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';
import { McpServer } from './framework';
import { sortFilesForCaching } from '../pruner/cacheSorter';

// Initialize the MCP server using our custom framework
const server = new McpServer({
  name: 'context-it',
  version: '2.2.1',
  enableSchemaMinimization: true,
});

// Add a diagnostic logging middleware
server.use(async (ctx, next) => {
  const start = Date.now();
  console.error(`[MCP] [${ctx.type.toUpperCase()}] Request: ${ctx.name} | Args: ${JSON.stringify(ctx.arguments || {})}`);
  try {
    const result = await next();
    const duration = Date.now() - start;
    console.error(`[MCP] [${ctx.type.toUpperCase()}] Success: ${ctx.name} in ${duration}ms`);
    return result;
  } catch (error: any) {
    console.error(`[MCP] [${ctx.type.toUpperCase()}] Error in ${ctx.name}: ${error.message || error}`);
    throw error;
  }
});

// Register Tool: get_pruned_context
server.tool(
  'get_pruned_context',
  'Extracts an AST-pruned, dependency-mapped, caching-optimized context starting from a target file and symbol.',
  {
    entryFile: {
      type: 'string',
      description: 'Path to the entry file (absolute or relative to workspace root)',
      required: true,
    },
    symbol: {
      type: 'string',
      description: 'Focus only on a specific class or function dependency tree',
      required: false,
    },
    mode: {
      type: 'string',
      enum: ['full', 'decl'],
      description: "Pruning mode: 'full' (keep used function bodies) or 'decl' (declaration-only for dependencies)",
      required: false,
    },
  },
  async (args) => {
    const entryFile = args.entryFile;
    const symbol = args.symbol;
    const mode = args.mode || 'full';

    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(absolutePath, symbol);
    return pruner.prune(resolution, { mode }, absolutePath);
  }
);

// Register Tool: analyze_dependencies
server.tool(
  'analyze_dependencies',
  'Analyzes and returns the dependency import map starting from an entry file.',
  {
    entryFile: {
      type: 'string',
      description: 'Path to the entry file',
      required: true,
    },
  },
  async (args) => {
    const entryFile = args.entryFile;
    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    const resolver = new DependencyResolver();
    const resolution = resolver.resolve(absolutePath);

    const filePaths = Object.keys(resolution.filesToSymbols);
    return filePaths.map((f) => {
      const fileDeps = resolution.parsedFiles[f];
      return {
        file: path.relative(process.cwd(), f),
        imports: fileDeps.imports.map((i) => ({
          source: i.source,
          resolved: path.relative(process.cwd(), i.resolvedPath),
          specifiers: i.specifiers,
        })),
      };
    });
  }
);

// Register Tool: compile_prompt_context
server.tool(
  'compile_prompt_context',
  'Compiles a deterministically cache-aligned and token-budgeted prompt context starting from an entry point and target symbol.',
  {
    entryFile: {
      type: 'string',
      description: 'Path to the entry file',
      required: true,
    },
    symbol: {
      type: 'string',
      description: 'Focus only on a specific class or function dependency tree',
      required: false,
    },
    mode: {
      type: 'string',
      enum: ['full', 'decl'],
      description: "Pruning mode: 'full' or 'decl'",
      required: false,
    },
    taskInstruction: {
      type: 'string',
      description: 'Task description / instruction for Context IR',
      required: false,
    },
    tokenBudget: {
      type: 'number',
      description: 'Maximum token budget ceiling',
      required: false,
    },
  },
  async (args) => {
    const entryFile = args.entryFile;
    const symbol = args.symbol;
    const mode = args.mode || 'full';
    const tokenBudget = args.tokenBudget;

    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    const resolver = new DependencyResolver();
    const pruner = new CodePruner();

    const resolution = resolver.resolve(absolutePath, symbol);
    return pruner.prune(resolution, { mode, tokenBudget }, absolutePath);
  }
);

// Register Tool: get_cache_status
server.tool(
  'get_cache_status',
  'Analyzes the project dependency tree and returns caching stability levels and dynamic cache-breaker files.',
  {
    entryFile: {
      type: 'string',
      description: 'Path to the entry file',
      required: true,
    },
    symbol: {
      type: 'string',
      description: 'Focus only on a specific class or function dependency tree',
      required: false,
    },
  },
  async (args) => {
    const entryFile = args.entryFile;
    const symbol = args.symbol;

    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    const resolver = new DependencyResolver();
    const resolution = resolver.resolve(absolutePath, symbol);

    const findRoot = (p: string) => {
      let dir = path.dirname(path.resolve(p));
      while (dir !== path.parse(dir).root) {
        if (fs.existsSync(path.join(dir, '.git'))) return dir;
        dir = path.dirname(dir);
      }
      return path.dirname(path.resolve(p));
    };
    const root = findRoot(absolutePath);

    const sorted = sortFilesForCaching(resolution, absolutePath, root);

    const levelsBreakdown: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const [f, lvl] of Object.entries(sorted.levels)) {
      const rel = path.relative(root, f);
      levelsBreakdown[lvl as number].push(rel);
    }

    const totalFiles = Object.keys(resolution.filesToSymbols).length;

    return {
      cachingSummary: {
        totalFiles,
        level1Count: levelsBreakdown[1].length,
        level2Count: levelsBreakdown[2].length,
        level3Count: levelsBreakdown[3].length,
        level4Count: levelsBreakdown[4].length,
      },
      dynamicFiles: levelsBreakdown[4],
      levels: {
        level1_static: levelsBreakdown[1],
        level2_core: levelsBreakdown[2],
        level3_utilities: levelsBreakdown[3],
        level4_dynamic_entry: levelsBreakdown[4],
      },
    };
  }
);

export async function runServer() {
  await server.start();
}

if (require.main === module) {
  runServer().catch(console.error);
}
