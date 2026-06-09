# ContextIt

ContextIt is a tool designed to extract target symbols and their resolved dependencies from source code files. Using Abstract Syntax Tree (AST) analysis, it prunes unused functions, classes, type declarations, and imports to generate a minimized representation of a codebase for use in LLM contexts.

### Context Size Metrics (Gemini 3.5 Flash)

| Repository / Scenario | Raw Codebase Context | ContextIt Pruned | Slicing Ratio |
|---|---|---|---|
| Next.js Realworld App | 22,878 tokens | 330 tokens | 69.3x |
| Express Framework | 30,550 tokens | 278 tokens | 109.9x |
| Fastify Framework | 120,770 tokens | 10,693 tokens | 11.3x |
| Hono Framework | 335,930 tokens | 15,130 tokens | 22.2x |
| Lodash Library | 481,559 tokens | 29 tokens | 16605.5x |
| Medium Project (Synthetic) | 2,867 tokens | 588 tokens | 4.9x |
| Large Project (Synthetic) | 23,527 tokens | 2,447 tokens | 9.6x |
| Scale Project (300+ Files) | 44,055 tokens | 15,020 tokens | 2.9x |

*Estimated tokens calculated at ~3.7 characters per token. Cost estimates are based on Gemini 3.5 Flash pricing ($1.50 per 1 million input tokens).*

Detailed benchmark parameters, cost calculations, and reproduction instructions are available in [benchmark.md](benchmark.md).

## Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a target class, function, or symbol. Supports JavaScript/TypeScript, Python, and Rust.
- **AST Pruning**: Strips out unused code, functions, classes, and declarations from imported utility files.
- **Declaration-Only Mode**: Removes function and method bodies from resolved dependencies, leaving only type definitions and signatures.
- **Deterministic File Sorting**: Organizes output files deterministically to align with Prompt Caching requirements.
- **MCP Server Support**: Implements a Model Context Protocol (MCP) server for integration with IDE agents.

## Getting Started

### Installation
```bash
npm install
npm run build
```

### Running Tests and Validation
To execute the automated unit test suite:
```bash
npm test
```

To execute the compilation validation test (verifying that the pruned codebase compiles without syntax or type errors):
```bash
npm run validate
```

### CLI Usage
To prune context starting from an entry point and target symbol:
```bash
npm run cli -- --entry src/cli/cli.ts --symbol main --mode decl --output context.md
```

### MCP Server Integration
To run as an MCP server, configure your host application to invoke:
```bash
node dist/mcp/mcpServer.js
```

## License

MIT
