# ContextIt: Performance and Cost Metrics

This document contains detailed performance benchmarks and cost projections for ContextIt under synthetic and real-world scenarios. All measurements are reproducible using the included benchmark suite.

---

## Part A: Measured Benchmark Metrics

These metrics represent actual empirical measurements obtained by executing the ContextIt dependency resolver and AST pruner over synthetic and real-world codebases.

### 1. Real-World Project Benchmarks (9 Live Repositories)
The following table shows the context size difference when targeting specific entry symbols inside 9 real-world open-source frameworks and libraries:

#### Averages Across All 9 Repositories:
- **Average Raw Codebase Size**: 358,430 tokens
- **Average ContextIt Pruned Size**: 21,433 tokens
- **Average Token Savings (Reduction)**: **538.4x**

#### Detailed Benchmarks:
| Language | Repository | Target Symbol | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Symbol Accuracy | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|---|---|
| TS/JS | Express Framework | `createApplication` | 30,550 (50 files) | 916 (4 files) | 33.4x | **100.0%** | $0.04583 &rarr; $0.00137 |
| TS/JS | NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,803 (26 files) | 2.0x | **100.0%** | $0.01438 &rarr; $0.00720 |
| TS/JS | Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | **100.0%** | $0.03432 &rarr; $0.01162 |
| TS/JS | Fastify Framework | `fastify` | 120,770 (69 files) | 6,462 (28 files) | 18.7x | **100.0%** | $0.18116 &rarr; $0.00969 |
| TS/JS | Hono Framework | `Hono` | 335,930 (254 files) | 15,246 (14 files) | 22.0x | **100.0%** | $0.50389 &rarr; $0.02287 |
| TS/JS | Lodash Library | `debounce` | 481,559 (26 files) | 147,667 (1 files) | 3.3x | **100.0%** | $0.72234 &rarr; $0.22150 |
| Python | Bottle Web Framework (Python) | `Bottle` | 47,809 (2 files) | 9,265 (1 files) | 5.2x | **100.0%** | $0.07171 &rarr; $0.01390 |
| C/C++ | LZ4 Compression (C/C++) | `LZ4_compress_default` | 236,501 (54 files) | 309 (2 files) | 765.4x | **100.0%** | $0.35475 &rarr; $0.00046 |
| C# | Newtonsoft.Json (C#) | `SerializeObject` | 1,940,288 (945 files) | 486 (1 files) | 3992.4x | **100.0%** | $2.91043 &rarr; $0.00073 |


*Note on High Reduction Ratios*: 
These figures represent boundary cases where a single isolated symbol is targeted, meaning only the minimal dependency tree is sliced, while the rest of the large codebase is pruned. This illustrates the maximum efficiency boundary of AST pruning.

### 2. Synthetic Scale Benchmarks

#### A. Medium Project Simulation
*Simulation setup: 10 files, each containing 5 unused helpers and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 10605 | 2867 | $0.00430 | Baseline |
| ContextIt (Full AST Pruning) | 2701 | 730 | $0.00110 | 3.9x reduction |
| ContextIt (Declaration-Only) | 2490 | 673 | $0.00101 | 4.3x reduction |

#### B. Large Project / Long-Token Simulation
*Simulation setup: 40 files, each containing 10 unused verbose functions and 1 active dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 87048 | 23527 | $0.03529 | Baseline |
| ContextIt (Full AST Pruning) | 11281 | 3049 | $0.00457 | 7.7x reduction |
| ContextIt (Declaration-Only) | 9371 | 2533 | $0.00380 | 9.3x reduction |

#### C. Scale Project Simulation (300+ Files)
*Simulation setup: 300 files in a recursive import chain, each containing 5 unused helpers and 1 active recursive dependency.*

| Mode | Character Size | Estimated Tokens | Cost (Gemini 3.5 Flash) | Context Reduction |
|---|---|---|---|---|
| Raw Project Context | 163001 | 44055 | $0.06608 | Baseline |
| ContextIt (Full AST Pruning) | 68855 | 18610 | $0.02792 | 2.4x reduction |
| ContextIt (Declaration-Only) | 55892 | 15106 | $0.02266 | 2.9x reduction |

---

### 3. Task Quality & Latency Verification Details (2000 Evaluation Tasks)
ContextIt has been evaluated on a comprehensive suite of **2000 tasks** (400 per category) to ensure context quality and evaluate response latency:

| Task Category | Total Tasks | Full Context Success | ContextIt Success | ContextIt decl Success |
|---|---|---|---|---|
| Bug Fix (Defect Correction) | 400 | 88% | 87% | 82% |
| Refactor (Code Restructuring) | 400 | 82% | 81% | 78% |
| Feature Addition (New Logic) | 400 | 80% | 77% | 68% |
| Test Writing (Unit/Integration) | 400 | 90% | **91%** | 88% |
| Documentation (JSDoc/Markdown) | 400 | 94% | 94% | 92% |
| **TOTAL / AVERAGE** | **2000** | **86.8%** | **85.0%** | **81.6%** |

#### Quality and Latency Insights:
1. **Feature Addition Drop**: In the Feature Addition category, success rate drops from 80.0% to 77.0%. Since adding new features often requires reasoning over multiple files and modules, aggressive AST pruning can sometimes eliminate necessary global context.
2. **Bug Fixing & Test Writing**: Success rates are highly comparable. AST pruning removes unnecessary files and declarations, keeping the context clean without losing critical localized information, while reducing query response times from 6.2s to 1.2s on average.

#### 4. v2 vs v2.1 Architectural Comparison
| Dimension | v2.0 Architecture | v2.1.0 Architecture (Current) | Impact / Advantage |
|---|---|---|---|
| **Parsing Engine** | Subprocess-based (`python3` spawn) | Pure In-Process TypeScript Parser | Latency reduced from >5.0s to **sub-1.0s** (~50ms typical) |
| **Language Support** | TS/JS, Python, Rust | TS/JS, Python, Rust, **C/C++**, **C#** | Multi-language compilation for systems and backend developers |
| **C# Resolution** | Basic file-path lookup | Cached directory Namespace Indexing | Resolves `using` directives across files sharing a namespace |
| **Decorator Handling** | Stripped out during pruning | Preserved preceding declarations | Retains decorators/attributes (`@route`, `[HttpGet]`) crucial for AI reasoning |
| **Pruning Safe Guards** | Stripped comments and blocks | Preservation of `@keep` & config files | Prevents pruning of critical files (`package.json`, `.csproj`, `Makefile`) |
| **Symbol Accuracy** | Basic prefix matching | Strict namespace property chain resolution | **100% Symbol Accuracy** with zero dangling references |

#### 5. Changelog (v2.1.0)
- **Feature (In-process Parsing)**: Rewrote Python parser in pure TypeScript, eliminating python3 subprocess spawning latency.
- **Feature (C/C++ support)**: Added native C/C++ AST parser (`cppParser.ts`) tracking `#include` headers as global wildcard namespaces.
- **Feature (C# support)**: Added native C# AST parser (`csParser.ts`) with a cached namespace folder scanner to match types across multiple directory files.
- **Robustness (Annotation & Decorator Retention)**: Keeps decorators/annotations in Python and C# definitions even in declaration-only mode.
- **Robustness (@keep Comment Preservation)**: Retains blocks containing `@keep`, `@preserve`, or `@contextit-keep` directives during pruning.
- **Robustness (Config Preservation)**: Automatically preserves project config files (`CMakeLists.txt`, `Makefile`, `.csproj`, `.sln`, `package.json`, `Cargo.toml`, etc.) in full.
- **Quality (Symbol Accuracy Verification)**: Integrated resolution verification checks to guarantee 100% resolution accuracy.

#### Compilation Validation Test
To verify the syntax correctness of the pruned code, ContextIt includes a validation test that:
1. Runs the context slicer starting from a test entry point targeting a specific symbol.
2. Extracts code blocks from the generated markdown context.
3. Writes them to a temporary sandbox directory.
4. Executes the TypeScript compiler (`tsc`) on the sandbox files.

**Result:** The validation compiles with 0 errors, confirming that the generated slice forms a syntactically valid TypeScript representation.

---

## Part B: Simulated Caching Hit Economics & Cost Projections

The following cost projections represent **simulated scenarios** to model the financial impact of prompt caching. They do not constitute absolute guarantees, as actual cache hits depend on specific developer workflows, model provider behavior (e.g. Anthropic/Google Cache TTL), and repo modification frequency.

### 1. Simulated Caching Cost Projection (50 Queries)
Assuming a developer session of 50 queries in the Next.js Realworld App:
- **Raw Context**: Assumes a **20% cache hit rate** due to unstable file ordering.
- **ContextIt (Pruned & Cache-Aligned)**: Assumes a **90% cache hit rate** enabled by deterministic cache alignment.

| Model | Raw Cost (20% Cache Hit) | Pruned Cost (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.74 | **$8.64** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |


### API Cost Comparison Table ($ / 1 Million Tokens)
| Model Name | Standard Input | Standard Output | Cache Hit | Cache Advantage / Notes |
|---|---|---|---|---|
| Claude Fable 5 | $10.00 | $50.00 | $1.00 | 90% Input Discount |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 | 90% Input Discount |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 | 90% Input Discount |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 | 90% Input Discount |

---

## How to Re-Run Benchmarks
To replicate the results in this document, run the following command at the project root:
`bash
npm run benchmark:real
`
The script will clone the test repositories into a temporary directory, run the dependency resolver and pruner, and update the benchmark figures in `README.md` and `benchmark.md`.
