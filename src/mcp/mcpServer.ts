import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { DependencyResolver } from '../parser/resolver';
import { CodePruner } from '../pruner/pruner';
import { minimizeTool } from './schemaMinimizer';

const server = new Server(
  {
    name: 'context-it',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: 'get_pruned_context',
      description: 'Extracts an AST-pruned, dependency-mapped, caching-optimized context starting from a target file and symbol.',
      inputSchema: {
        type: 'object',
        properties: {
          entryFile: {
            type: 'string',
            description: 'Path to the entry file (absolute or relative to workspace root)',
          },
          symbol: {
            type: 'string',
            description: 'Focus only on a specific class or function dependency tree',
          },
          mode: {
            type: 'string',
            enum: ['full', 'decl'],
            description: "Pruning mode: 'full' (keep used function bodies) or 'decl' (declaration-only for dependencies)",
          },
        },
        required: ['entryFile'],
      },
    },
    {
      name: 'analyze_dependencies',
      description: 'Analyzes and returns the dependency import map starting from an entry file.',
      inputSchema: {
        type: 'object',
        properties: {
          entryFile: {
            type: 'string',
            description: 'Path to the entry file',
          },
        },
        required: ['entryFile'],
      },
    },
    {
      name: 'compile_prompt_context',
      description: 'Compiles a deterministically cache-aligned and token-budgeted prompt context starting from an entry point and target symbol.',
      inputSchema: {
        type: 'object',
        properties: {
          entryFile: {
            type: 'string',
            description: 'Path to the entry file',
          },
          symbol: {
            type: 'string',
            description: 'Focus only on a specific class or function dependency tree',
          },
          mode: {
            type: 'string',
            enum: ['full', 'decl'],
            description: "Pruning mode: 'full' or 'decl'",
          },
          taskInstruction: {
            type: 'string',
            description: 'Task description / instruction for Context IR',
          },
          tokenBudget: {
            type: 'number',
            description: 'Maximum token budget ceiling',
          },
        },
        required: ['entryFile'],
      },
    },
    {
      name: 'get_cache_status',
      description: 'Analyzes the project dependency tree and returns caching stability levels and dynamic cache-breaker files.',
      inputSchema: {
        type: 'object',
        properties: {
          entryFile: {
            type: 'string',
            description: 'Path to the entry file',
          },
          symbol: {
            type: 'string',
            description: 'Focus only on a specific class or function dependency tree',
          },
        },
        required: ['entryFile'],
      },
    },
  ];

  return {
    tools: tools.map(minimizeTool),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_pruned_context') {
    const entryFile = args?.entryFile as string;
    const symbol = args?.symbol as string | undefined;
    const mode = (args?.mode as 'full' | 'decl' | undefined) || 'full';

    const absolutePath = path.resolve(entryFile);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    try {
      const resolver = new DependencyResolver();
      const pruner = new CodePruner();

      const resolution = resolver.resolve(absolutePath, symbol);
      const resultContext = pruner.prune(resolution, { mode }, absolutePath);

      return {
        content: [
          {
            type: 'text',
            text: resultContext,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error during context compression: ${error.message || error}`,
          },
        ],
      };
    }
  }

  if (name === 'analyze_dependencies') {
    const entryFile = args?.entryFile as string;
    const absolutePath = path.resolve(entryFile);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    try {
      const resolver = new DependencyResolver();
      const resolution = resolver.resolve(absolutePath);
      
      const filePaths = Object.keys(resolution.filesToSymbols);
      const output = filePaths.map(f => {
        const fileDeps = resolution.parsedFiles[f];
        return {
          file: path.relative(process.cwd(), f),
          imports: fileDeps.imports.map(i => ({
            source: i.source,
            resolved: path.relative(process.cwd(), i.resolvedPath),
            specifiers: i.specifiers
          }))
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error analyzing dependencies: ${error.message || error}`,
          },
        ],
      };
    }
  }

  if (name === 'compile_prompt_context') {
    const entryFile = args?.entryFile as string;
    const symbol = args?.symbol as string | undefined;
    const mode = (args?.mode as 'full' | 'decl' | undefined) || 'full';
    const tokenBudget = args?.tokenBudget as number | undefined;

    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    try {
      const resolver = new DependencyResolver();
      const pruner = new CodePruner();
      const resolution = resolver.resolve(absolutePath, symbol);
      const resultContext = pruner.prune(resolution, { mode, tokenBudget }, absolutePath);

      return {
        content: [
          {
            type: 'text',
            text: resultContext,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error compiling prompt context: ${error.message || error}`,
          },
        ],
      };
    }
  }

  if (name === 'get_cache_status') {
    const entryFile = args?.entryFile as string;
    const symbol = args?.symbol as string | undefined;

    const absolutePath = path.resolve(entryFile);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${entryFile}`);
    }

    try {
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

      const { sortFilesForCaching } = require('../pruner/cacheSorter');
      const sorted = sortFilesForCaching(resolution, absolutePath, root);

      const levelsBreakdown: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
      for (const [f, lvl] of Object.entries(sorted.levels)) {
        const rel = path.relative(root, f);
        levelsBreakdown[lvl as number].push(rel);
      }

      const totalFiles = Object.keys(resolution.filesToSymbols).length;

      const responseText = JSON.stringify({
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
          level4_dynamic_entry: levelsBreakdown[4]
        }
      }, null, 2);

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error analyzing cache status: ${error.message || error}`,
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ContextIt MCP Server running on Stdio');
}

if (require.main === module) {
  runServer().catch(console.error);
}
