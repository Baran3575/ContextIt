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
| Express Framework | `createApplication` | 30,550 (50 files) | 278 (3 files) | 109.9x | $0.04583 &rarr; $0.00042 |
| NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,859 (26 files) | 2.0x | $0.01438 &rarr; $0.00729 |
| Next.js Realworld App | `Home` | 22,878 (62 files) | 330 (3 files) | 69.3x | $0.03432 &rarr; $0.00049 |
| Fastify Framework | `fastify` | 120,770 (69 files) | 10,693 (20 files) | 11.3x | $0.18116 &rarr; $0.01604 |
| Hono Framework | `Hono` | 335,930 (254 files) | 15,130 (14 files) | 22.2x | $0.50389 &rarr; $0.02269 |
| Lodash Library | `debounce` | 481,559 (26 files) | 29 (1 files) | 16605.5x | $0.72234 &rarr; $0.00004 |


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
| ContextIt (Full AST Pruning) | 2386 | 645 | $0.00097 | 4.4x reduction |
| ContextIt (Declaration-Only) | 2175 | 588 | $0.00088 | 4.9x reduction |

### B. Large Project / Long-Token Simulation
*Simulation setup: 40 files, each containing 10 unused verbose functions and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 87048 | 23527 | $0.03529 | Baseline |
| ContextIt (Full AST Pruning) | 10963 | 2963 | $0.00444 | 7.9x reduction |
| ContextIt (Declaration-Only) | 9052 | 2447 | $0.00367 | 9.6x reduction |

### C. Scale Project Simulation (300+ Files)
*Simulation setup: 300 files in a recursive import chain, each containing 5 unused helpers and 1 active recursive dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 163001 | 44055 | $0.06608 | Baseline |
| ContextIt (Full AST Pruning) | 68536 | 18524 | $0.02779 | 2.4x reduction |
| ContextIt (Declaration-Only) | 55573 | 15020 | $0.02253 | 2.9x reduction |

---


## 3. Quality and Correctness Metrics
Evaluating structural completeness and syntax correctness of the pruned code.

### A. Static Quality Metrics (Synthetic Codebase Analysis)
*Target: Tracing dependencies for `calculateTotal` in a project with 10 modules, each having 5 unused functions.*

| Metric | Raw Codebase Context | ContextIt Pruned | Result |
|---|---|---|---|
| Context Size | 2164 tokens | 544 tokens | 4.0x reduction |
| Compilation Validity | compiles successfully | compiles successfully | 0 syntax/type errors |
| Dangling References | 0 | 0 | 0 dangling references |
| Needed Symbols Density | 18.0% | 100.0% | 5.5x density ratio |
| Unused Symbols Count | 50 unused symbols | 0 unused symbols | 0 unused symbols in context |


## 4. Long-Term Cost Projection
Assuming a development session where a coding agent is queried 50 times to implement a new feature in the Next.js Realworld App:
- Using Raw Context:
  - Total tokens sent: 50 * 22,878 = 1,143,900 tokens
  - Total Cost: $1.72
- Using ContextIt (Pruned):
  - Total tokens sent: 50 * 330 = 16,500 tokens
  - Total Cost: $0.02
- Difference: $1.70

---

## 5. Context Quality Verification Details

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

## 6. How to Re-Run Benchmarks
To replicate the results in this document, run the following command at the project root:
```bash
npm run benchmark:real
```
The script will clone the test repositories into a temporary directory, run the dependency resolver and pruner, and update the benchmark figures in `README.md` and `benchmark.md`.
