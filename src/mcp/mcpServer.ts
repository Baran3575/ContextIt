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
  return {
    tools: [
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
    ],
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
