# ContextIt: Implementation Plan

ContextIt is an open-source CLI and Model Context Protocol (MCP) server designed to optimize the context size, token usage, latency, and cost for AI coding agents (such as Claude Desktop, Cline, Roo Code, Aider). It works by tracing imports and symbols starting from a target entry point, building a dependency graph, and pruning unused code using Abstract Syntax Trees (ASTs).

This document outlines the phase-by-phase development plan.

---

## Technical Stack & Architecture

- **Runtime & Language**: Node.js & TypeScript
- **Dependencies**:
  - `commander`: For CLI interface.
  - `@modelcontextprotocol/sdk`: For MCP Server protocol support.
  - `@babel/parser` / `typescript`: For JavaScript and TypeScript AST parsing.
  - `tree-sitter` / `tree-sitter-languages`: For Python and fallback parser support.
  - `tiktoken` or `@anthropic-ai/sdk`: For token counting estimation.

---

## Phase 1: Project Initialization & CLI Skeleton

### Objectives
Initialize the project structure, configure TypeScript, build the CLI skeleton, and establish basic project files.

### Tasks
1. Initialize npm project: `npm init -y`
2. Install dev dependencies: `typescript`, `@types/node`, `ts-node`, `jest`, `@types/jest`, `rimraf`.
3. Configure `tsconfig.json` with strict mode, ESNext target, and proper module resolution.
4. Set up `jest.config.js` for TypeScript testing.
5. Create basic directory structure:
   - `src/cli/`: Command Line Interface entry points and arguments.
   - `src/parser/`: AST parsing and dependency extraction logic.
   - `src/pruner/`: Code pruning and compression logic.
   - `src/mcp/`: MCP Server implementation.
   - `src/benchmark/`: Scripts for evaluating token savings.
   - `tests/`: Unit and integration tests.
6. Build basic CLI entrypoint (`src/index.ts`) using `commander` that accepts basic options:
   - `--entry <file>`: Target entry file.
   - `--symbol <name>`: Optional class/function to focus on.
   - `--mode <full|decl>`: Pruning mode (`full` for AST-pruned bodies, `decl` for type signatures only).

---

## Phase 2: AST Parser & Dependency Resolver

### Objectives
Implement AST parsing and recursive dependency tracing for JavaScript/TypeScript and Python.

### Tasks
1. **TypeScript/JavaScript Parser (`src/parser/tsParser.ts`)**:
   - Parse files using TypeScript Compiler API or Babel.
   - Extract imports (ESM `import ... from`, CommonJS `require()`).
   - Map exports (functions, classes, variables).
   - Trace references to local symbols inside the target file.
2. **Python Parser (`src/parser/pyParser.ts`)**:
   - Parse files using `tree-sitter-python`.
   - Extract imports (`import x`, `from y import z`).
   - Extract local class and function definitions.
3. **Recursive Dependency Resolver (`src/parser/resolver.ts`)**:
   - Starting from an entry point, recursively build a Directed Acyclic Graph (DAG) of dependencies.
   - Prevent infinite loops using a visited-files set.
   - Categorize nodes by importance (Direct Dependency, Transitive Dependency, Type Definition, Schema).

---

## Phase 3: AST Code Pruner & Caching Optimizer

### Objectives
Implement code pruning modes to strip unused lines/definitions, and structure context to maximize Claude's Prompt Caching hit rate.

### Tasks
1. **Full AST Pruning Mode (`src/pruner/fullPruner.ts`)**:
   - For any dependency file, strip out functions, classes, and imports that are *not* called or referenced by the entry point.
   - Keep the body of the used functions/classes intact.
2. **Declaration-Only Mode (`src/pruner/declPruner.ts`)**:
   - For all transitive dependency files, strip out the bodies of all functions/methods.
   - Retain only the function signatures, class interfaces, type definitions, and JSDoc comments.
3. **Deterministic Caching Sorter (`src/pruner/cacheSorter.ts`)**:
   - Sort context contents deterministically to maximize cache hits.
   - Order:
     1. Large global types, schemas, and configurations (least likely to change).
     2. Transitive utility files (medium likelihood to change).
     3. Direct dependencies.
     4. The target entry file (most likely to change - placed at the very end).
4. **Context Generator**:
   - Combine pruned code sections into a single markdown block with clear file path headings (e.g., `## file:///path/to/file.ts`).

---

## Phase 4: MCP Server Integration

### Objectives
Expose ContextIt as a Model Context Protocol (MCP) server so that AI agents like Claude Desktop or Cline can execute context slicing autonomously.

### Tasks
1. Set up `@modelcontextprotocol/sdk` server instance.
2. Register MCP Tools:
   - `get_pruned_context`: Parameters: `entryFile` (string), `symbol` (optional string), `mode` (optional enum: `full` | `decl`). Returns the compressed markdown context.
   - `analyze_dependencies`: Parameters: `entryFile` (string). Returns JSON tree of imports.
3. Set up standard I/O transport (stdin/stdout) for agent communication.
4. Create installation script and config templates for `claude_desktop_config.json` and Cline/Roo Code configurations.

---

## Phase 5: Automated Benchmarking Suite & README Update

### Objectives
Create a test framework that measures context compression rates (size, tokens, cost) and updates the repository documentation with actual data.

### Tasks
1. **Benchmark Runner (`src/benchmark/runner.ts`)**:
   - Prepare mock workspace scenarios:
     - **Small project**: Single entry point with 3 small modules.
     - **Medium project**: Express API with database schemas, utils, and controllers.
     - **Large project**: React/Next.js repo with multiple components and utilities.
   - Execute both "Full Context" (raw concatenation of all files) and "ContextIt Context" (AST-pruned context).
   - Count tokens using `gpt-3-encoder` or `tiktoken` (estimating Claude 3.5 Sonnet token costs).
   - Record:
     - Original file count vs. pruned file count.
     - Original token count vs. pruned token count.
     - Compression ratio (e.g., 5.4x, 12.1x reduction).
     - Cost savings estimation (based on $3/million input tokens for Claude 3.5 Sonnet).
2. **Markdown Generator**:
   - Generate a markdown table summarizing the benchmark results.
   - Automatically inject this table into the repository's `README.md`.

---

## Phase 6: Comprehensive Testing & Quality Assurance

### Objectives
Ensure stability across different operating systems, file sizes, and edge cases (like syntax errors, circular dependencies).

### Tasks
1. **Unit Tests**:
   - Test AST parsing accuracy on various JS/TS syntax constructs (arrow functions, default exports, namespaces).
   - Test pruning accuracy (ensure code behaves the same but is stripped correctly).
2. **Integration Tests**:
   - Run the CLI tool and assert correct markdown outputs.
   - Run the MCP server in a mock client environment to assert protocol compliance.
3. **CI/CD Configuration**:
   - Setup GitHub Actions to run tests, build the TypeScript project, and check linting on pull requests.

---

## Success Metrics

| Metric | Target |
|---|---|
| **Token Reduction** | > 75% average reduction on medium-to-large projects |
| **Parsing Latency** | < 500ms for projects up to 500 files |
| **Cache Hit Rate Improvement** | > 80% cache reuse on consecutive queries |
| **Accuracy** | 0 compilation/syntax errors in the generated pruned code block |
