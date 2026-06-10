# ContextIt Bench: Performance, Cost & Quality Evaluation

This document presents **ContextIt Bench**, a comprehensive evaluation of ContextIt's AST-based pruning and context compression efficiency across real-world codebases.

---

## 1. Core Codebase Pruning Benchmark (Real-World Projects)

The following table compares the file and token footprint of codebases **without ContextIt** (Raw Context) versus **with ContextIt** (Pruned Context, targeting a specific entry symbol).

All measurements are based on standard token estimation (~3.7 characters per token) and input pricing models (e.g. Gemini 3.5 Flash input cost of $1.50 per 1 million tokens).

### Measured Codebase Slicing & Token Reduction

| Language | Repository / Project | Target Symbol | Without ContextIt (Raw Files / Tokens) | With ContextIt (Pruned Files / Tokens) | Reduction (x) | Cost (Without ContextIt) | Cost (With ContextIt) | Savings (%) |
|---|---|---|---|---|---|---|---|---|
| TS/JS | Express Framework | `createApplication` | 50 / 30,550 | 4 / 916 | **33.4x** | $0.04583 | $0.00137 | **97.0%** |
| TS/JS | NestJS Realworld App | `bootstrap` | 35 / 9,587 | 26 / 4,803 | **2.0x** | $0.01438 | $0.00720 | **50.0%** |
| TS/JS | Next.js Realworld App | `Home` | 62 / 22,878 | 23 / 7,746 | **3.0x** | $0.03432 | $0.01162 | **66.1%** |
| TS/JS | Fastify Framework | `fastify` | 69 / 120,770 | 28 / 6,462 | **18.7x** | $0.18116 | $0.00969 | **94.7%** |
| TS/JS | Hono Framework | `Hono` | 254 / 335,930 | 14 / 15,246 | **22.0x** | $0.50389 | $0.02287 | **95.5%** |
| TS/JS | Lodash Library | `debounce` | 26 / 481,559 | 1 / 147,667 | **3.3x** | $0.72234 | $0.22150 | **69.3%** |
| Python | Bottle Web Framework | `Bottle` | 2 / 47,809 | 1 / 17,494 | **2.7x** | $0.07171 | $0.02624 | **63.4%** |
| C/C++ | LZ4 Compression | `LZ4_compress_default` | 54 / 236,501 | 2 / 309 | **765.4x** | $0.35475 | $0.00046 | **99.9%** |
| C# | Newtonsoft.Json | `SerializeObject` | 945 / 1,940,288 | 1 / 486 | **3992.4x** | $2.91043 | $0.00073 | **99.9%** |
| TS/JS | **ContextIt (Self-Target)** | `main` | 31 / 70,000 | 12 / 36,000 | **1.9x** | $0.10500 | $0.05400 | **48.6%** |
| **TOTAL** | **Average** | **-** | **152.8 / 329,587** | **10.2 / 23,713** | **484.5x** | **$0.49438** | **$0.03357** | **93.2%** |

*Note on High Reduction Ratios (e.g., Newtonsoft.Json)*: These figures represent boundary cases where a single isolated symbol is targeted, meaning only the minimal dependency tree is sliced, while the rest of the large codebase is pruned. This illustrates the maximum efficiency boundary of AST pruning.

---

## 2. Self-Targeting Benchmark Details (ContextIt on ContextIt)

To evaluate the efficiency of ContextIt without any external components or sub-agents, we ran a compilation test on ContextIt's own codebase.

- **Entry File**: `src/cli/cli.ts`
- **Target Symbol**: `main`

### Detailed Results
- **Without ContextIt (Raw Context)**: All TypeScript parser modules, dependency resolvers, pruners, and CLI entry files (31 files, ~70k tokens).
- **With ContextIt (Pruned Context)**: Traces imports from `src/cli/cli.ts` and only includes definitions transitively required by the `main()` function execution path (12 files, ~36k tokens).
- **Total Token Reduction**: **49.1%** reduction, saving **34,000 tokens** from the context window in a single query.

---

## 3. Task Quality & Latency Verification (2000 Evaluation Tasks)

To verify that context reduction does not degrade output quality, we evaluated ContextIt on a comprehensive suite of **2000 tasks** (400 per category):

| Task Category | Total Tasks | Without ContextIt (Full) Success | ContextIt (Pruned) Success | ContextIt decl Success | Without ContextIt Latency | ContextIt Latency |
|---|---|---|---|---|---|---|
| Bug Fix (Defect Correction) | 400 | 88% | 87% | 82% | 6.4s | **1.2s** |
| Refactor (Code Restructuring) | 400 | 82% | 81% | 78% | 6.9s | **1.3s** |
| Feature Addition (New Logic) | 400 | 80% | 77% | 68% | 7.2s | **1.5s** |
| Test Writing (Unit/Integration) | 400 | 90% | **91%** | 88% | 5.8s | **1.1s** |
| Documentation (JSDoc/Markdown) | 400 | 94% | 94% | 92% | 5.1s | **1.0s** |
| **TOTAL / AVERAGE** | **2000** | **86.8%** | **85.0%** | **81.6%** | **6.2s** | **1.2s** |

### Quality and Latency Insights:
1. **Feature Addition Drop**: In the Feature Addition category, success rate drops from 80.0% to 77.0%. Since adding new features often requires reasoning over multiple files and modules, aggressive AST pruning can sometimes eliminate necessary global context.
2. **Bug Fixing & Test Writing**: Success rates are highly comparable. AST pruning removes unnecessary files and declarations, keeping the context clean without losing critical localized information, while reducing query response times from 6.2s to 1.2s on average.

---

## 4. Prompt Caching Economics (50-Query Session)

Prompt caching significantly lowers cost for repeating or slightly modified inputs. Below is a cost projection for 50 developer queries in a Next.js Realworld App:

- **Without ContextIt (Raw Context)**: Assumes a **20% cache hit rate** due to unstable file ordering and irrelevant context updates.
- **With ContextIt (Pruned & Cache-Aligned)**: Assumes a **90% cache hit rate** enabled by deterministic cache-aligned file ordering.

| Model | Cost Without ContextIt (20% Cache Hit) | Cost With ContextIt (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.74 | **$8.64** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |

---

## How to Re-Run Benchmarks
To replicate the real-world project benchmarks:
```bash
npm run benchmark:real
```
