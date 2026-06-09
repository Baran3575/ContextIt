# ContextIt

ContextIt is a tool designed to extract target symbols and their resolved dependencies from source code files. Using Abstract Syntax Tree (AST) analysis, it prunes unused functions, classes, type declarations, and imports to generate a minimized representation of a codebase for use in LLM contexts.

### Context Size Metrics (Gemini 3.5 Flash)

| Repository / Scenario | Raw Codebase Context | ContextIt Pruned | Slicing Ratio |
|---|---|---|---|
| Next.js Realworld App | 22,878 tokens | 7,724 tokens | 3.0x |
| Express Framework | 30,550 tokens | 986 tokens | 31.0x |
| Fastify Framework | 120,770 tokens | 13,586 tokens | 8.9x |
| Hono Framework | 335,930 tokens | 15,195 tokens | 22.1x |
| Lodash Library | 481,559 tokens | 94 tokens | 5123.0x |
| Medium Project (Synthetic) | 2,867 tokens | 652 tokens | 4.4x |
| Large Project (Synthetic) | 23,527 tokens | 2,512 tokens | 9.4x |
| Scale Project (300+ Files) | 44,055 tokens | 15,085 tokens | 2.9x |

*Estimated tokens calculated at ~3.7 characters per token. Cost estimates are based on Gemini 3.5 Flash pricing ($1.50 per 1 million input tokens).*

Detailed benchmark parameters, cost calculations, and reproduction instructions are available in [benchmark.md](benchmark.md).

## Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a target class, function, or symbol. Supports JavaScript/TypeScript, Python, and Rust.
- **AST Pruning**: Strips out unused code, functions, classes, and declarations from imported utility files.
- **Declaration-Only Mode**: Removes function and method bodies from resolved dependencies, leaving only type definitions and signatures.
- **Deterministic File Sorting**: Organizes output files deterministically to align with Prompt Caching requirements.
- **MCP Server Support**: Implements a Model Context Protocol (MCP) server for integration with IDE agents.

## Getting Started

### Installation & Environment Setup

#### 1. Standard Installation
```bash
npm install
npm run build
```

#### 2. Termux / Android Setup
To run ContextIt on Termux with high performance:
1. Install Node.js LTS and Python:
   ```bash
   pkg install nodejs-lts python
   ```
2. Clone the repository and install dependencies:
   ```bash
   npm install
   npm run build
   ```
3. ContextIt automatically interfaces with Termux's local Python interpreter for AST parsing without requiring extra external libraries or system dependencies.

#### 3. Global Command Setup (Easier Usage)
You can link ContextIt globally to use the `contextit` command directly anywhere:
```bash
npm link
```
Now you can run:
```bash
contextit --entry src/cli/cli.ts --symbol main
```

---

## Usage Modes

### 1. CLI Usage
Prune context starting from a specific file and entry point symbol:
```bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
```
*(Prints a comprehensive, real-time context reduction report including raw tokens, pruned tokens, and cost savings directly to the console).*

### 2. Benchmark Automation Mode
ContextIt includes an automated, tam-nesnel (completely objective) benchmark runner that measures performance, compression ratios, and estimated Gemini 3.5 Flash input costs.
To run the full suite (synthetic projects up to 300+ files, plus cloning and slicing real-world projects like Express, NestJS, Next.js, Fastify, Hono, and Lodash):
```bash
contextit benchmark
```
This automatically runs the slices, prints results, and regenerates both `README.md` and `benchmark.md` with actual performance metrics.

### 3. Model Context Protocol (MCP) Integration
ContextIt implements the Model Context Protocol (MCP) server. This allows AI coding assistants (e.g. Claude Desktop, Roo Code, Cline, Aider) to execute context slicing autonomously to keep contexts small and dramatically decrease LLM token consumption and costs.

Add this configuration to your host configuration file (e.g., `claude_desktop_config.json` or Roo Code's mcp configuration):
```json
{
  "mcpServers": {
    "contextit": {
      "command": "node",
      "args": ["/absolute/path/to/contextit/dist/mcp/mcpServer.js"]
    }
  }
}
```

#### Available MCP Tools
- `get_pruned_context`: Returns pruned code blocks targeting a specific class/function and its dependencies (with built-in token savings metadata prepended for the AI).
- `analyze_dependencies`: Returns the full JSON dependency tree of imports starting from an entry file.

---

## Slicing Optimization Tips
1. **Target Specific Symbols**: When using the MCP server tool or CLI, specify the exact function or class you are editing (via `--symbol`). This ensures ContextIt prunes the context to only the code path the LLM actually needs, reducing token overhead by up to **99.9%**.
2. **Use Declaration-Only Mode (`--mode decl` )**: For large utility or framework dependencies, use `decl` mode. This strips function bodies and keeps only type signatures, preserving the structure for context while saving thousands of tokens.
3. **Prompt Caching Alignment**: ContextIt deterministically sorts output files by order of likelihood to change (placing large static types first and the entry file at the absolute end), which naturally aligns with prompt caching systems like Claude 3.5 Sonnet to maximize cache hits.

## License

MIT
