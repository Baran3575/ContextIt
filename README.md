# ContextIt 🛡️

ContextIt is an open-source, Abstract Syntax Tree (AST) powered context compressor and Model Context Protocol (MCP) server. It reduces token consumption, latency, and costs for AI coding agents (such as Claude Desktop, Cline, Roo Code, Aider) by programmatically slicing codebases down to only what is needed.

## Benchmarks

### 1. Token & Cost Reduction (Medium Project Simulation)
Here is a performance comparison of sending the entire context of a simulated medium-sized project (10 modules, multiple helper functions) vs. using **ContextIt** with a target symbol:

| Mode | Context Character Size | Estimated Tokens | Cost (Claude 3.5 Sonnet) | Context Reduction |
|---|---|---|---|---|
| **Raw Project Context** | 18954 | 5123 | $0.01537 | *Baseline* |
| **ContextIt (Full AST Pruning)** | 2375 | 642 | $0.00193 | **8.0x reduction** |
| **ContextIt (Declaration-Only)** | 2164 | 585 | $0.00176 | **8.8x reduction** |

*Estimated tokens calculated at ~3.7 characters per token. Costs calculated using standard Claude 3.5 Sonnet pricing ($3.00 / million input tokens).*

### 2. Objective Compilation Validation Test
To verify the structural integrity of the pruned code, ContextIt includes an objective validation suite. This suite performs the following steps automatically:
1. Runs the context slicer starting from a test entry point targeting a specific symbol.
2. Extracts code blocks from the generated markdown context.
3. Automatically writes them to a temporary sandbox directory.
4. Executes the TypeScript compiler (`tsc`) on the sandbox files.

**Result:** The validation compiles with **0 errors**, proving that ContextIt generates a syntactically correct and self-contained codebase representation while reducing token size by **8x-9x**.

---

## Key Features

- **Symbol-level AST Dependency Resolution**: Traces recursive imports and references starting from a specific target class, function, or symbol.
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

To run the **Objective Compilation Validation (TAM NESNEL TEST)** which verifies that the compressed context has zero compilation errors:
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
