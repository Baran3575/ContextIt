# ContextIt: Performance and Cost Metrics

This document contains detailed performance benchmarks and cost projections for ContextIt under synthetic and real-world scenarios. All measurements are reproducible using the included benchmark suite.

## Benchmark Methodology
1. **Raw Project Context**: The benchmark loader reads all relevant source files in the project directory, serializes their contents together with file path comments, and measures the token count.
2. **ContextIt Pruned**: ContextIt runs its dependency resolver starting from the designated entry point and target symbol, prunes all unused symbols/imports, formats the output into markdown, and measures the token count.
3. **Token Estimation**: Estimated tokens are calculated at a rate of 3.7 characters per token.
4. **Cost Model**: Cost calculations are based on Gemini 3.5 Flash input token pricing: $1.50 per 1 million input tokens.

---

## 1. Real-World Project Benchmarks
The following table shows the context size difference when targeting specific entry symbols inside real-world open-source frameworks and boilerplates:

| Repository | Entry Point & Target | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|
| Express Framework | `createApplication` | 30,550 (50 files) | 988 (4 files) | 30.9x | $0.04583 &rarr; $0.00148 |
| NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,918 (26 files) | 1.9x | $0.01438 &rarr; $0.00738 |
| Next.js Realworld App | `Home` | 22,878 (62 files) | 7,726 (23 files) | 3.0x | $0.03432 &rarr; $0.01159 |
| Fastify Framework | `fastify` | 120,770 (69 files) | 13,588 (28 files) | 8.9x | $0.18116 &rarr; $0.02038 |
| Hono Framework | `Hono` | 335,930 (254 files) | 15,197 (14 files) | 22.1x | $0.50389 &rarr; $0.02280 |
| Lodash Library | `debounce` | 481,559 (26 files) | 96 (1 files) | 5016.2x | $0.72234 &rarr; $0.00014 |


### Observations
- NestJS App (1.2x): NestJS has a module structure. Starting from the entry point (`bootstrap` in `main.ts`), the `AppModule` imports and references the majority of the codebase. The 1.2x reduction reflects that the codebase is traversed and required for execution.
- Lodash Library (16,605.5x): When importing a single function like `debounce` from Lodash, loading the entire codebase introduces token overhead. ContextIt prunes the context down to only the `debounce` function and its active dependencies.

---

## 2. Synthetic Scale Benchmarks

### A. Medium Project Simulation
*Simulation setup: 10 files, each containing 5 unused helpers and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 10605 | 2867 | $0.00430 | Baseline |
| ContextIt (Full AST Pruning) | 2628 | 711 | $0.00107 | 4.0x reduction |
| ContextIt (Declaration-Only) | 2417 | 654 | $0.00098 | 4.4x reduction |

### B. Large Project / Long-Token Simulation
*Simulation setup: 40 files, each containing 10 unused verbose functions and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 87048 | 23527 | $0.03529 | Baseline |
| ContextIt (Full AST Pruning) | 11208 | 3030 | $0.00455 | 7.8x reduction |
| ContextIt (Declaration-Only) | 9298 | 2513 | $0.00377 | 9.4x reduction |

### C. Scale Project Simulation (300+ Files)
*Simulation setup: 300 files in a recursive import chain, each containing 5 unused helpers and 1 active recursive dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 163001 | 44055 | $0.06608 | Baseline |
| ContextIt (Full AST Pruning) | 68782 | 18590 | $0.02789 | 2.4x reduction |
| ContextIt (Declaration-Only) | 55819 | 15087 | $0.02263 | 2.9x reduction |

---

## 3. Long-Term Cost Projection
Assuming a development session where a coding agent is queried 50 times to implement a new feature in the Next.js Realworld App:
- Using Raw Context:
  - Total tokens sent: 50 * 22,878 = 1,143,900 tokens
  - Total Cost: $1.72
- Using ContextIt (Pruned):
  - Total tokens sent: 50 * 7,726 = 386,300 tokens
  - Total Cost: $0.58
- Difference: $1.14

---

## 4. Context Quality Verification Details

### Pruned Context Code Density
In typical codebase contexts, a portion of the raw tokens consists of declarations that are not imported or referenced by the entry symbol. Pruning these symbols yields a representation containing only the referenced dependencies.

### Compilation Validation Test
To verify the syntax correctness of the pruned code, ContextIt includes a validation test that:
1. Runs the context slicer starting from a test entry point targeting a specific symbol.
2. Extracts code blocks from the generated markdown context.
3. Writes them to a temporary sandbox directory.
4. Executes the TypeScript compiler (`tsc`) on the sandbox files.

**Result:** The validation compiles with 0 errors, confirming that the generated slice forms a syntactically valid TypeScript representation.

---

## 5. How to Re-Run Benchmarks
To replicate the results in this document, run the following command at the project root:
```bash
npm run benchmark:real
```
The script will clone the test repositories into a temporary directory, run the dependency resolver and pruner, and update the benchmark figures in `README.md` and `benchmark.md`.
