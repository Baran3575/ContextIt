# ContextIt: Quick Start & Integration Guide for AI Agents

Welcome! If you are an AI coding assistant (like Claude, Gemini, or GPT), this guide will help you understand how to use **ContextIt** to compress large codebases, minimize token usage, and significantly improve your context window comprehension.

---

## 1. What is ContextIt?

ContextIt is an **AST-powered Context Compiler**. Instead of reading entire folders or massive raw source files:
1. It starts from an **Entry File** (e.g., `app.ts` or `main.py`).
2. It traces **imports/dependencies** recursively only for a specific **Target Symbol** (e.g., a function, method, or class).
3. It **prunes** unused helper functions, classes, and comments from the resolved files.
4. It compiles the result into a clean, **cache-aligned Markdown context package** or **JSON Context IR**.

---

## 2. When Should You Use It?

You should use ContextIt when:
* **The codebase is too large**: Avoid cluttering your context window with thousands of lines of unrelated code.
* **You want to save money/tokens**: Reduce input context size by up to 99% (e.g., 300k tokens down to 15k).
* **You need faster responses**: Smaller inputs mean the model generates responses up to 80% faster.
* **You target specific features**: You want to edit or read only the dependency tree of a specific class (e.g., `UserController` or `DatabaseDriver`).

---

## 3. How to Use ContextIt via CLI

As an agent, you can run ContextIt using simple CLI commands directly in the terminal:

### A. Basic Full Pruning (Recommended)
Compile the context starting from an entry file, focusing on a specific class or function:
```bash
node dist/cli/cli.js compile -e src/index.ts -s DependencyResolver
```

### B. Declaration-Only Mode (Minimal Footprint)
If you only need to understand class signatures and API interfaces without function body implementations, use `-m decl`:
```bash
node dist/cli/cli.js compile -e src/index.ts -s CodePruner -m decl
```

### C. Show Compression Statistics
Add `--stats` to print a file-by-file token reduction summary table:
```bash
node dist/cli/cli.js compile -e src/index.ts -s CodePruner --stats
```

### D. Save to Output File
Save the compiled markdown context package directly to a file:
```bash
node dist/cli/cli.js compile -e src/index.ts -s DependencyResolver -o pruned_context.md
```

---

## 4. How to Use ContextIt via MCP (Model Context Protocol)

If ContextIt is registered as an MCP server, you can call these tools directly:

### `get_pruned_context`
Extracts an AST-pruned, dependency-mapped markdown context.
* **Arguments**:
  * `entryFile` (string, required): Path to the entry file.
  * `symbol` (string, optional): Focus symbol (class or function).
  * `mode` (string, optional): `"full"` or `"decl"`.

### `compile_prompt_context`
Compiles a deterministically cache-aligned and token-budgeted prompt context.
* **Arguments**:
  * `entryFile` (string, required).
  * `symbol` (string, optional).
  * `mode` (string, optional).
  * `tokenBudget` (number, optional): Max token limit for the context.

### `get_cache_status`
Analyzes dependency tree levels and dynamic cache-breaker files.
* **Arguments**:
  * `entryFile` (string, required).
  * `symbol` (string, optional).

---

## 5. Pro-Tips for AI Agents

1. **Start Localized**: When assigned to fix a bug in `Calculator`, call `compile -e src/app.ts -s Calculator` first. This gives you all calculator dependencies without database or server noise.
2. **Use `@keep` comments**: If you write code that should never be pruned by ContextIt in declaration mode, add a `// @keep` or `# @keep` comment above that block.
3. **Use Stats to Debug**: If you suspect context pruning went too far, run with `--stats` to inspect which files were pruned and by how much.
