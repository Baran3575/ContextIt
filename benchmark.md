# ContextIt: Performance and Cost Metrics

This document contains detailed performance benchmarks and cost projections for ContextIt under synthetic and real-world scenarios. All measurements are reproducible using the included benchmark suite.

## Benchmark Methodology
1. **Raw Project Context**: The benchmark loader reads all relevant source files in the project directory, serializes their contents together with file path comments, and measures the token count.
2. **ContextIt Pruned**: ContextIt runs its dependency resolver starting from the designated entry point and target symbol, prunes all unused symbols/imports, formats the output into markdown, and measures the token count.
3. **Token Estimation**: Estimated tokens are calculated at a rate of 3.7 characters per token.
4. **Cost Model**: Cost calculations are based on multi-model pricing representing standard input costs and cache hit discounts.

---

## 1. Real-World Project Benchmarks
The following table shows the context size difference when targeting specific entry symbols inside real-world open-source frameworks and boilerplates:

| Repository | Entry Point & Target | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|
| Express Framework | `createApplication` | 30,550 (50 files) | 1,008 (4 files) | 30.3x | $0.04583 &rarr; $0.00151 |
| NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,937 (26 files) | 1.9x | $0.01438 &rarr; $0.00741 |
| Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | $0.03432 &rarr; $0.01162 |
| Fastify Framework | `fastify` | 120,770 (69 files) | 13,608 (28 files) | 8.9x | $0.18116 &rarr; $0.02041 |
| Hono Framework | `Hono` | 335,930 (254 files) | 15,217 (14 files) | 22.1x | $0.50389 &rarr; $0.02283 |
| Lodash Library | `debounce` | 481,559 (26 files) | 115 (1 files) | 4187.5x | $0.72234 &rarr; $0.00017 |


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
| ContextIt (Full AST Pruning) | 2701 | 730 | $0.00110 | 3.9x reduction |
| ContextIt (Declaration-Only) | 2490 | 673 | $0.00101 | 4.3x reduction |

### B. Large Project / Long-Token Simulation
*Simulation setup: 40 files, each containing 10 unused verbose functions and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 87048 | 23527 | $0.03529 | Baseline |
| ContextIt (Full AST Pruning) | 11281 | 3049 | $0.00457 | 7.7x reduction |
| ContextIt (Declaration-Only) | 9371 | 2533 | $0.00380 | 9.3x reduction |

### C. Scale Project Simulation (300+ Files)
*Simulation setup: 300 files in a recursive import chain, each containing 5 unused helpers and 1 active recursive dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 163001 | 44055 | $0.06608 | Baseline |
| ContextIt (Full AST Pruning) | 68855 | 18610 | $0.02792 | 2.4x reduction |
| ContextIt (Declaration-Only) | 55892 | 15106 | $0.02266 | 2.9x reduction |

---

## 3. Long-Term Cost & Caching Projection
Assuming a developer session of 50 queries in the Next.js Realworld App:
- **Raw Context**: Assumes a 20% cache hit rate due to random file ordering.
- **ContextIt (Pruned & Cache-Aligned)**: Assumes a 90% cache hit rate enabled by deterministic cache alignment.

*Note: Actual cache hits vary based on model family, workflow, and repo churn rate. These calculations represent simulated scenarios for comparison.*

| Model | Raw Cost (20% Cache Hit) | Pruned Cost (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.74 | **$8.64** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |


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
