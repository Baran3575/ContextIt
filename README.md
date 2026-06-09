# ContextIt 🛡️

ContextIt is an open-source, Abstract Syntax Tree (AST) powered context compressor and Model Context Protocol (MCP) server. It reduces token consumption, latency, and costs for AI coding agents by programmatically slicing codebases down to only the symbols and dependencies required to execute or understand a specific target.

### Quick Performance Overview (Gemini 3.5 Flash)

| Scenario | Raw Tokens | ContextIt (Pruned) | Reduction |
|---|---|---|---|
| **Next.js Realworld App** | 22,878 | 330 | **69.3x** |
| **Express Framework** | 30,550 | 278 | **109.9x** |
| **Fastify Framework** | 120,770 | 10,693 | **11.3x** |
| **Hono Framework** | 335,930 | 15,130 | **22.2x** |
| **Lodash Library** | 481,559 | 29 | **16605.5x** |
| **Medium Project (Synthetic)** | 2,867 | 588 | **4.9x** |
| **Large Project (Synthetic)** | 23,527 | 2,447 | **9.6x** |

*Estimated tokens calculated at ~3.7 characters per token. Cost calculated based on Gemini 3.5 Flash pricing ($1.50 / million input tokens).*

For detailed benchmark parameters, cost analysis, and steps to reproduce, see the [benchmark.md](benchmark.md) file.

## Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a specific target class, function, or symbol. Supports JavaScript/TypeScript, Python, and Rust.
- **AST Pruning**: Automatically strips out unused code, functions, classes, and declarations from imported utility files.
- **Declaration-Only mode**: Further compresses dependencies by stripping function bodies, leaving only type definitions and function signatures.
- **Prompt Caching Friendly**: Deterministically orders files to maximize Claude's Prompt Caching hit rates.
- **MCP Server Support**: Works out-of-the-box as an MCP server with tools compatible with popular IDE agents.

## Getting Started

### Installation
```bash
npm install
npm run build
```

### Running Tests and Validation
To run the automated test suite:
```bash
npm test
```

To run the **Objective Compilation Validation** which verifies that the compressed context compiles with zero type errors:
```bash
npm run validate
```

### CLI Usage
To extract an optimized context starting from an entry point and target function:
```bash
npm run cli -- --entry src/cli/cli.ts --symbol main --mode decl --output context.md
```

### MCP Server Integration
To run as an MCP server, configure your host application (like Claude Desktop) to run:
```bash
node dist/mcp/mcpServer.js
```

## LICENSE

MIT
