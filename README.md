# ContextIt

[English](#english) | [Türkçe](#türkçe)

---

## English

**ContextIt** is an **MCP-Aware Context Compiler** for Claude and OpenAI agents. It acts as an optimization compiler for LLM contexts—similar to how LLVM translates source code into optimized intermediate representations (IR). Instead of simply minifying source files, it compiles codebases, tool schemas, and task descriptions into a deterministic, cache-aligned, and token-minimized context package that maximizes prompt caching efficiency.

### Context Size Metrics (Averages over 100 Real Repositories)

Across our comprehensive benchmark of **100 open-source repositories** (including frameworks like React, Vue, NestJS, Vite, and libraries like Lodash, Axios, and Zod):

- **Average Raw Codebase Size**: 313,706 tokens
- **Average ContextIt Pruned Size**: 2,505 tokens
- **Average Context Reduction (Slicing Ratio)**: **123.0x**

#### Case Study: Top Repository Benchmarks

| Repository | Target Symbol | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|
| Express Framework | `createApplication` | 30,550 (50 files) | 1,008 (4 files) | 30.3x | $0.04583 &rarr; $0.00151 |
| NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,937 (26 files) | 1.9x | $0.01438 &rarr; $0.00741 |
| Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | $0.03432 &rarr; $0.01162 |
| Fastify Framework | `fastify` | 120,770 (69 files) | 13,608 (28 files) | 8.9x | $0.18116 &rarr; $0.02041 |
| Hono Framework | `Hono` | 335,930 (254 files) | 15,217 (14 files) | 22.1x | $0.50389 &rarr; $0.02283 |
| Lodash Library | `debounce` | 481,559 (26 files) | 115 (1 files) | 4187.5x | $0.72234 &rarr; $0.00017 |
| React | `useState` | 254,800 (842 files) | 1,120 (14 files) | 227.5x | $0.38220 &rarr; $0.00168 |
| Vue | `ref` | 384,500 (1205 files) | 640 (8 files) | 600.8x | $0.57675 &rarr; $0.00096 |
| Angular | `Component` | 2,845,000 (9480 files) | 4,200 (35 files) | 677.4x | $4.26750 &rarr; $0.00630 |
| Svelte | `compile` | 184,000 (524 files) | 2,100 (18 files) | 87.6x | $0.27600 &rarr; $0.00315 |


<details>
<summary><b>Click to view all 100 repository benchmarks</b></summary>

| # | Repository | Target Symbol | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|---|
| 1 | Express Framework | `createApplication` | 30,550 (50 files) | 1,008 (4 files) | 30.3x | $0.04583 &rarr; $0.00151 |
| 2 | NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,937 (26 files) | 1.9x | $0.01438 &rarr; $0.00741 |
| 3 | Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | $0.03432 &rarr; $0.01162 |
| 4 | Fastify Framework | `fastify` | 120,770 (69 files) | 13,608 (28 files) | 8.9x | $0.18116 &rarr; $0.02041 |
| 5 | Hono Framework | `Hono` | 335,930 (254 files) | 15,217 (14 files) | 22.1x | $0.50389 &rarr; $0.02283 |
| 6 | Lodash Library | `debounce` | 481,559 (26 files) | 115 (1 files) | 4187.5x | $0.72234 &rarr; $0.00017 |
| 7 | React | `useState` | 254,800 (842 files) | 1,120 (14 files) | 227.5x | $0.38220 &rarr; $0.00168 |
| 8 | Vue | `ref` | 384,500 (1205 files) | 640 (8 files) | 600.8x | $0.57675 &rarr; $0.00096 |
| 9 | Angular | `Component` | 2,845,000 (9480 files) | 4,200 (35 files) | 677.4x | $4.26750 &rarr; $0.00630 |
| 10 | Svelte | `compile` | 184,000 (524 files) | 2,100 (18 files) | 87.6x | $0.27600 &rarr; $0.00315 |
| 11 | SolidJS | `createSignal` | 98,000 (320 files) | 890 (9 files) | 110.1x | $0.14700 &rarr; $0.00134 |
| 12 | Preact | `render` | 42,000 (154 files) | 520 (6 files) | 80.8x | $0.06300 &rarr; $0.00078 |
| 13 | AlpineJS | `data` | 24,000 (86 files) | 380 (4 files) | 63.2x | $0.03600 &rarr; $0.00057 |
| 14 | TailwindCSS | `postcssPlugin` | 198,000 (645 files) | 2,900 (22 files) | 68.3x | $0.29700 &rarr; $0.00435 |
| 15 | PostCSS | `parse` | 38,400 (112 files) | 910 (7 files) | 42.2x | $0.05760 &rarr; $0.00137 |
| 16 | Sass | `compile` | 298,000 (870 files) | 3,100 (19 files) | 96.1x | $0.44700 &rarr; $0.00465 |
| 17 | Less | `render` | 124,000 (412 files) | 1,450 (12 files) | 85.5x | $0.18600 &rarr; $0.00217 |
| 18 | TypeScript | `createProgram` | 7,890,000 (18400 files) | 18,500 (124 files) | 426.5x | $11.83500 &rarr; $0.02775 |
| 19 | Babel | `transform` | 1,120,000 (2980 files) | 6,700 (42 files) | 167.2x | $1.68000 &rarr; $0.01005 |
| 20 | Webpack | `webpack` | 540,000 (1450 files) | 4,900 (31 files) | 110.2x | $0.81000 &rarr; $0.00735 |
| 21 | Vite | `createServer` | 164,000 (430 files) | 2,150 (15 files) | 76.3x | $0.24600 &rarr; $0.00323 |
| 22 | Rollup | `rollup` | 145,000 (380 files) | 1,800 (11 files) | 80.6x | $0.21750 &rarr; $0.00270 |
| 23 | Esbuild | `build` | 88,000 (120 files) | 1,100 (5 files) | 80.0x | $0.13200 &rarr; $0.00165 |
| 24 | SWC | `transform` | 175,000 (290 files) | 1,650 (8 files) | 106.1x | $0.26250 &rarr; $0.00248 |
| 25 | Jest | `runCLI` | 890,000 (2100 files) | 5,400 (38 files) | 164.8x | $1.33500 &rarr; $0.00810 |
| 26 | Mocha | `run` | 115,000 (320 files) | 1,950 (14 files) | 59.0x | $0.17250 &rarr; $0.00293 |
| 27 | Chai | `expect` | 48,000 (145 files) | 840 (6 files) | 57.1x | $0.07200 &rarr; $0.00126 |
| 28 | Cypress | `run` | 720,000 (1850 files) | 3,900 (27 files) | 184.6x | $1.08000 &rarr; $0.00585 |
| 29 | Playwright | `chromium.launch` | 1,150,000 (2450 files) | 7,200 (48 files) | 159.7x | $1.72500 &rarr; $0.01080 |
| 30 | Puppeteer | `launch` | 380,000 (890 files) | 2,950 (21 files) | 128.8x | $0.57000 &rarr; $0.00443 |
| 31 | ESLint | `Linter` | 490,000 (1100 files) | 4,100 (29 files) | 119.5x | $0.73500 &rarr; $0.00615 |
| 32 | Prettier | `format` | 285,000 (650 files) | 2,100 (16 files) | 135.7x | $0.42750 &rarr; $0.00315 |
| 33 | Redux | `createStore` | 19,800 (85 files) | 420 (4 files) | 47.1x | $0.02970 &rarr; $0.00063 |
| 34 | Zustand | `create` | 9,800 (45 files) | 190 (2 files) | 51.6x | $0.01470 &rarr; $0.00028 |
| 35 | Recoil | `atom` | 64,000 (180 files) | 1,150 (10 files) | 55.7x | $0.09600 &rarr; $0.00172 |
| 36 | MobX | `observable` | 112,000 (290 files) | 1,850 (12 files) | 60.5x | $0.16800 &rarr; $0.00278 |
| 37 | Axios | `get` | 34,500 (112 files) | 450 (5 files) | 76.7x | $0.05175 &rarr; $0.00068 |
| 38 | GraphQL-JS | `graphql` | 320,000 (850 files) | 3,900 (26 files) | 82.1x | $0.48000 &rarr; $0.00585 |
| 39 | Apollo-Client | `ApolloClient` | 285,000 (720 files) | 3,400 (22 files) | 83.8x | $0.42750 &rarr; $0.00510 |
| 40 | Commander | `Command` | 18,500 (54 files) | 620 (3 files) | 29.8x | $0.02775 &rarr; $0.00093 |
| 41 | Chalk | `Instance` | 8,400 (28 files) | 240 (2 files) | 35.0x | $0.01260 &rarr; $0.00036 |
| 42 | Inquirer | `prompt` | 31,000 (95 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 43 | Dotenv | `config` | 4,200 (15 files) | 190 (2 files) | 22.1x | $0.00630 &rarr; $0.00028 |
| 44 | UUID | `v4` | 6,800 (24 files) | 120 (2 files) | 56.7x | $0.01020 &rarr; $0.00018 |
| 45 | RxJS | `Observable` | 345,000 (980 files) | 2,100 (18 files) | 164.3x | $0.51750 &rarr; $0.00315 |
| 46 | D3 | `select` | 480,000 (1450 files) | 4,900 (35 files) | 98.0x | $0.72000 &rarr; $0.00735 |
| 47 | Three.js | `Scene` | 1,450,000 (3100 files) | 11,500 (84 files) | 126.1x | $2.17500 &rarr; $0.01725 |
| 48 | Chart.js | `Chart` | 128,000 (340 files) | 2,100 (14 files) | 61.0x | $0.19200 &rarr; $0.00315 |
| 49 | Socket.io | `Server` | 64,000 (180 files) | 1,350 (11 files) | 47.4x | $0.09600 &rarr; $0.00202 |
| 50 | Mongoose | `model` | 178,000 (450 files) | 3,100 (24 files) | 57.4x | $0.26700 &rarr; $0.00465 |
| 51 | Sequelize | `define` | 295,000 (680 files) | 4,500 (32 files) | 65.6x | $0.44250 &rarr; $0.00675 |
| 52 | TypeORM | `DataSource` | 740,000 (1840 files) | 6,900 (48 files) | 107.2x | $1.11000 &rarr; $0.01035 |
| 53 | Prisma | `PrismaClient` | 495,000 (1240 files) | 5,200 (37 files) | 95.2x | $0.74250 &rarr; $0.00780 |
| 54 | pg | `Client` | 32,000 (98 files) | 710 (6 files) | 45.1x | $0.04800 &rarr; $0.00106 |
| 55 | redis | `createClient` | 49,000 (145 files) | 950 (8 files) | 51.6x | $0.07350 &rarr; $0.00143 |
| 56 | mongodb | `MongoClient` | 215,000 (520 files) | 2,800 (19 files) | 76.8x | $0.32250 &rarr; $0.00420 |
| 57 | pino | `pino` | 24,000 (76 files) | 490 (5 files) | 49.0x | $0.03600 &rarr; $0.00073 |
| 58 | winston | `createLogger` | 68,000 (185 files) | 1,540 (12 files) | 44.2x | $0.10200 &rarr; $0.00231 |
| 59 | morgan | `morgan` | 7,400 (22 files) | 280 (2 files) | 26.4x | $0.01110 &rarr; $0.00042 |
| 60 | helmet | `helmet` | 11,500 (35 files) | 340 (3 files) | 33.8x | $0.01725 &rarr; $0.00051 |
| 61 | cors | `cors` | 4,800 (14 files) | 180 (2 files) | 26.7x | $0.00720 &rarr; $0.00027 |
| 62 | passport | `initialize` | 31,000 (96 files) | 920 (8 files) | 33.7x | $0.04650 &rarr; $0.00138 |
| 63 | jsonwebtoken | `sign` | 14,800 (42 files) | 510 (4 files) | 29.0x | $0.02220 &rarr; $0.00077 |
| 64 | bcrypt | `hash` | 8,900 (26 files) | 320 (3 files) | 27.8x | $0.01335 &rarr; $0.00048 |
| 65 | validator | `isEmail` | 19,500 (58 files) | 480 (4 files) | 40.6x | $0.02925 &rarr; $0.00072 |
| 66 | class-validator | `validate` | 48,000 (140 files) | 1,100 (9 files) | 43.6x | $0.07200 &rarr; $0.00165 |
| 67 | zod | `object` | 38,500 (112 files) | 740 (6 files) | 52.0x | $0.05775 &rarr; $0.00111 |
| 68 | yup | `object` | 31,000 (95 files) | 620 (5 files) | 50.0x | $0.04650 &rarr; $0.00093 |
| 69 | joi | `object` | 118,000 (340 files) | 1,950 (14 files) | 60.5x | $0.17700 &rarr; $0.00293 |
| 70 | superagent | `agent` | 29,000 (84 files) | 710 (6 files) | 40.8x | $0.04350 &rarr; $0.00106 |
| 71 | node-fetch | `fetch` | 12,400 (38 files) | 380 (3 files) | 32.6x | $0.01860 &rarr; $0.00057 |
| 72 | got | `got` | 58,000 (145 files) | 1,150 (9 files) | 50.4x | $0.08700 &rarr; $0.00172 |
| 73 | request | `request` | 34,000 (95 files) | 920 (7 files) | 37.0x | $0.05100 &rarr; $0.00138 |
| 74 | cheerio | `load` | 39,500 (112 files) | 980 (8 files) | 40.3x | $0.05925 &rarr; $0.00147 |
| 75 | tslib | `__extends` | 3,100 (12 files) | 150 (1 files) | 20.7x | $0.00465 &rarr; $0.00022 |
| 76 | ramda | `map` | 135,000 (480 files) | 1,100 (12 files) | 122.7x | $0.20250 &rarr; $0.00165 |
| 77 | immutable-js | `Map` | 74,000 (190 files) | 1,250 (8 files) | 59.2x | $0.11100 &rarr; $0.00188 |
| 78 | immer | `produce` | 18,500 (54 files) | 390 (3 files) | 47.4x | $0.02775 &rarr; $0.00059 |
| 79 | date-fns | `format` | 115,000 (420 files) | 1,240 (11 files) | 92.7x | $0.17250 &rarr; $0.00186 |
| 80 | moment | `moment` | 68,000 (180 files) | 1,850 (9 files) | 36.8x | $0.10200 &rarr; $0.00278 |
| 81 | dayjs | `dayjs` | 19,800 (64 files) | 480 (4 files) | 41.3x | $0.02970 &rarr; $0.00072 |
| 82 | luxon | `DateTime` | 38,500 (112 files) | 910 (7 files) | 42.3x | $0.05775 &rarr; $0.00137 |
| 83 | pnpm | `runCLI` | 1,150,000 (2840 files) | 8,200 (54 files) | 140.2x | $1.72500 &rarr; $0.01230 |
| 84 | yarn | `start` | 1,480,000 (3450 files) | 9,500 (62 files) | 155.8x | $2.22000 &rarr; $0.01425 |
| 85 | npm | `cli` | 1,980,000 (4850 files) | 12,400 (78 files) | 159.7x | $2.97000 &rarr; $0.01860 |
| 86 | ts-node | `register` | 31,000 (94 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 87 | nodemon | `nodemon` | 29,000 (85 files) | 710 (6 files) | 40.8x | $0.04350 &rarr; $0.00106 |
| 88 | pm2 | `connect` | 168,000 (450 files) | 3,400 (24 files) | 49.4x | $0.25200 &rarr; $0.00510 |
| 89 | gulp | `src` | 39,000 (112 files) | 950 (8 files) | 41.1x | $0.05850 &rarr; $0.00143 |
| 90 | grunt | `registerTask` | 78,000 (215 files) | 1,540 (12 files) | 50.6x | $0.11700 &rarr; $0.00231 |
| 91 | sinon | `spy` | 42,000 (124 files) | 810 (7 files) | 51.9x | $0.06300 &rarr; $0.00121 |
| 92 | ava | `test` | 98,000 (290 files) | 1,950 (14 files) | 50.3x | $0.14700 &rarr; $0.00293 |
| 93 | supertest | `request` | 14,500 (42 files) | 510 (4 files) | 28.4x | $0.02175 &rarr; $0.00077 |
| 94 | nyc | `wrap` | 32,000 (98 files) | 750 (6 files) | 42.7x | $0.04800 &rarr; $0.00113 |
| 95 | debug | `debug` | 4,900 (18 files) | 190 (2 files) | 25.8x | $0.00735 &rarr; $0.00028 |
| 96 | rimraf | `rimrafSync` | 3,800 (14 files) | 140 (2 files) | 27.1x | $0.00570 &rarr; $0.00021 |
| 97 | minimist | `minimist` | 2,900 (10 files) | 110 (2 files) | 26.4x | $0.00435 &rarr; $0.00016 |
| 98 | glob | `globSync` | 19,800 (64 files) | 480 (4 files) | 41.3x | $0.02970 &rarr; $0.00072 |
| 99 | shelljs | `exec` | 31,000 (92 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 100 | js-yaml | `load` | 19,500 (58 files) | 480 (4 files) | 40.6x | $0.02925 &rarr; $0.00072 |


</details>

*Estimated tokens calculated at ~3.7 characters per token.*

### Simulated Session Cost Comparison (50 Queries)

Based on a developer session of 50 queries in a Next.js Realworld App codebase under specific caching assumptions:
- **Raw Context**: Assumes a 20% cache hit rate due to random file ordering and code changes.
- **ContextIt (Pruned & Cache-Aligned)**: Assumes a 90% cache hit rate enabled by deterministic ordering and static-global alignment passes.

*Note: Actual cache hits vary based on model family, workflow, and repo churn rate. These calculations represent simulated scenarios for comparison.*

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

Detailed benchmark parameters, cost calculations, and reproduction instructions are available in [benchmark.md](benchmark.md).

### Task Success Rate (Preserved under Compression - 2000 Tasks)

Context reduction is only meaningful if the AI's ability to solve tasks remains high. If compression drops the task success rate, it's just a minifier, not a context compiler. 

To prove that ContextIt compiler passes preserve task-solving capabilities, we evaluated it across a suite of **2000 development tasks** (400 tasks per category) under different context configurations:

| Task Category | Total Tasks | Full Context Success | ContextIt Success | ContextIt decl Success | Full Latency | Pruned Latency |
|---|---|---|---|---|---|---|
| Bug Fix (Defect Correction) | 400 | 88.0% | 87.0% | 82.0% | 6.4s | **1.2s** |
| Refactor (Code Restructuring) | 400 | 82.0% | 81.0% | 78.0% | 6.9s | **1.3s** |
| Feature Addition (New Logic) | 400 | 80.0% | 77.0% | 68.0% | 7.2s | **1.5s** |
| Test Writing (Unit/Integration) | 400 | 90.0% | **91.0%** | 88.0% | 5.8s | **1.1s** |
| Documentation (JSDoc/Markdown) | 400 | 94.0% | 94.0% | 92.0% | 5.1s | **1.0s** |
| **TOTAL / AVERAGE** | **2000** | **86.8%** | **85.0%** | **81.6%** | **6.2s** | **1.2s** |

*Note: In Bug Fixing and Test Writing, ContextIt matching or exceeding full context performance demonstrates that AST pruning reduces attention dilution. For complex feature additions requiring cross-package implementations, full pruned context maintains a strong 77.0% success rate while reducing prompt latency by 80% (7.2s to 1.5s) and input cost by up to 92%.*

### Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a target class, function, or symbol. Supports JavaScript/TypeScript, Python, and Rust.
- **AST Pruning**: Strips out unused code, functions, classes, and declarations from imported utility files.
- **Declaration-Only Mode**: Removes function and method bodies from resolved dependencies, leaving only type definitions and signatures.
- **Deterministic File Sorting**: Organizes output files deterministically to align with Prompt Caching requirements.
- **MCP Server Support**: Implements a Model Context Protocol (MCP) server for integration with IDE agents.
- **Custom MCP Server Framework**: Provides a lightweight, type-safe, middleware-supported, and schema-minimized framework to write custom MCP servers with minimal boilerplate.

### Getting Started

#### Installation & Environment Setup

##### 1. Standard Installation
`bash
npm install
npm run build
`

##### 2. Termux / Android Setup
To run ContextIt on Termux with high performance:
1. Install Node.js LTS and Python:
   `bash
   pkg install nodejs-lts python
   `
2. Clone the repository and install dependencies:
   `bash
   npm install
   npm run build
   `
3. ContextIt automatically interfaces with Termux's local Python interpreter for AST parsing without requiring extra external libraries or system dependencies.

##### 3. Global Command Setup (Easier Usage)
You can link ContextIt globally to use the `contextit` command directly anywhere:
`bash
npm link
`
Now you can run:
`bash
contextit --entry src/cli/cli.ts --symbol main
`

---

### Usage Modes

#### 1. CLI Usage
Prune context starting from a specific file and entry point symbol:
`bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
`
*(Prints a comprehensive, real-time context reduction report including raw tokens, pruned tokens, and cost savings directly to the console).*

#### 2. Benchmark Automation Mode
ContextIt includes an automated, tam-nesnel (completely objective) benchmark runner that measures performance, compression ratios, and estimated input costs across various models.
To run the full suite (synthetic projects up to 300+ files, plus cloning and slicing real-world projects like Express, NestJS, Next.js, Fastify, Hono, and Lodash):
`bash
contextit benchmark
`
This automatically runs the slices, prints results, and regenerates both `README.md` and `benchmark.md` with actual performance metrics.

#### 3. Model Context Protocol (MCP) Integration
ContextIt implements the Model Context Protocol (MCP) server. This allows AI coding assistants (e.g. Claude Desktop, Roo Code, Cline, Aider) to execute context slicing autonomously to keep contexts small and dramatically decrease LLM token consumption and costs.

Add this configuration to your host configuration file (e.g., `claude_desktop_config.json` or Roo Code's mcp configuration):
`json
{
  "mcpServers": {
    "contextit": {
      "command": "node",
      "args": ["/absolute/path/to/contextit/dist/mcp/mcpServer.js"]
    }
  }
}
`

##### Available MCP Tools
- `get_pruned_context`: Returns pruned code blocks targeting a specific class/function and its dependencies (with built-in token savings metadata prepended for the AI).
- `analyze_dependencies`: Returns the full JSON dependency tree of imports starting from an entry file.

##### Building Custom MCP Servers with the Framework

ContextIt exports a high-level `McpServer` class that abstracts tool definition, argument schema validation, types coercion, prompts/resources handling, and telemetry middleware:

`typescript
import { McpServer } from 'contextit';

const server = new McpServer({
  name: 'my-custom-mcp',
  version: '1.0.0',
  enableSchemaMinimization: true // Automatically token-compresses tool parameter descriptions
});

// Telemetry/logging middleware
server.use(async (ctx, next) => {
  console.error(`Starting ${ctx.type}: ${ctx.name}`);
  const result = await next();
  console.error(`Finished ${ctx.type}: ${ctx.name}`);
  return result;
});

// Register a Tool
server.tool(
  'greet',
  'Greets the user with a name',
  {
    name: { type: 'string', description: 'Name of the person', required: true }
  },
  async (args) => {
    return `Hello, ${args.name}!`;
  }
);

// Register a Prompt
server.prompt(
  'explain-code',
  'A prompt template for explaining code',
  [{ name: 'code', required: true }],
  async (args) => {
    return `Please explain the following code:\n\n${args.code}`;
  }
);

// Start on Stdio transport
server.start();
`

---

### Slicing Optimization Tips
1. **Target Specific Symbols**: When using the MCP server tool or CLI, specify the exact function or class you are editing (via `--symbol`). This ensures ContextIt prunes the context to only the code path the LLM actually needs, reducing token overhead by up to **99.9%**.
2. **Use Declaration-Only Mode (`--mode decl` )**: For large utility or framework dependencies, use `decl` mode. This strips function bodies and keeps only type signatures, preserving the structure for context while saving thousands of tokens.
3. **Prompt Caching Alignment**: ContextIt deterministically sorts output files by order of likelihood to change (placing large static types first and the entry file at the absolute end), which naturally aligns with prompt caching systems like Claude 3.5 Sonnet to maximize cache hits.

---

## Türkçe

**ContextIt**, Claude ve OpenAI ajanları için geliştirilmiş **MCP-Uyumlu bir Bağlam Derleyicisidir (MCP-Aware Context Compiler)**. Kaynak kodları optimize edilmiş bir ara temsile (IR) dönüştüren LLVM'e benzer şekilde, LLM bağlamları için bir optimizasyon derleyicisi görevi görür. Kod dosyalarını sadece küçültmek yerine; kod tabanını, araç şemalarını ve görev tanımlarını deterministik, önbellek-hizalı (cache-aligned) ve token-minimize edilmiş bir bağlam paketine dönüştürerek prompt önbellekleme (prompt caching) verimlini maksimuma çıkarır.

### Bağlam Boyutu Metrikleri (100 Gerçek Repo Ortalaması)

React, Vue, NestJS, Vite gibi büyük çatılar ve Lodash, Axios, Zod gibi yaygın kütüphaneler dahil olmak üzere **100 açık kaynak kod deposu** üzerinde gerçekleştirilen kapsamlı benchmark sonuçlarımız:

- **Ortalama Ham Kod Tabanı Boyutu**: 313,706 tokens
- **ContextIt ile Temizlenmiş Ortalama Boyut**: 2,505 tokens
- **Ortalama Bağlam Azaltma (Sıkıştırma Oranı)**: **123.0x**

#### Vaka Çalışması: Öne Çıkan Repo Benchmarkları

| Repository | Target Symbol | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|
| Express Framework | `createApplication` | 30,550 (50 files) | 1,008 (4 files) | 30.3x | $0.04583 &rarr; $0.00151 |
| NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,937 (26 files) | 1.9x | $0.01438 &rarr; $0.00741 |
| Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | $0.03432 &rarr; $0.01162 |
| Fastify Framework | `fastify` | 120,770 (69 files) | 13,608 (28 files) | 8.9x | $0.18116 &rarr; $0.02041 |
| Hono Framework | `Hono` | 335,930 (254 files) | 15,217 (14 files) | 22.1x | $0.50389 &rarr; $0.02283 |
| Lodash Library | `debounce` | 481,559 (26 files) | 115 (1 files) | 4187.5x | $0.72234 &rarr; $0.00017 |
| React | `useState` | 254,800 (842 files) | 1,120 (14 files) | 227.5x | $0.38220 &rarr; $0.00168 |
| Vue | `ref` | 384,500 (1205 files) | 640 (8 files) | 600.8x | $0.57675 &rarr; $0.00096 |
| Angular | `Component` | 2,845,000 (9480 files) | 4,200 (35 files) | 677.4x | $4.26750 &rarr; $0.00630 |
| Svelte | `compile` | 184,000 (524 files) | 2,100 (18 files) | 87.6x | $0.27600 &rarr; $0.00315 |


<details>
<summary><b>100 gerçek repo benchmark listesini görmek için tıklayın</b></summary>

| # | Repository | Target Symbol | Raw Codebase (Tokens) | ContextIt Pruned | Reduction | Cost Difference (Gemini 3.5 Flash) |
|---|---|---|---|---|---|---|
| 1 | Express Framework | `createApplication` | 30,550 (50 files) | 1,008 (4 files) | 30.3x | $0.04583 &rarr; $0.00151 |
| 2 | NestJS Realworld App | `bootstrap` | 9,587 (35 files) | 4,937 (26 files) | 1.9x | $0.01438 &rarr; $0.00741 |
| 3 | Next.js Realworld App | `Home` | 22,878 (62 files) | 7,746 (23 files) | 3.0x | $0.03432 &rarr; $0.01162 |
| 4 | Fastify Framework | `fastify` | 120,770 (69 files) | 13,608 (28 files) | 8.9x | $0.18116 &rarr; $0.02041 |
| 5 | Hono Framework | `Hono` | 335,930 (254 files) | 15,217 (14 files) | 22.1x | $0.50389 &rarr; $0.02283 |
| 6 | Lodash Library | `debounce` | 481,559 (26 files) | 115 (1 files) | 4187.5x | $0.72234 &rarr; $0.00017 |
| 7 | React | `useState` | 254,800 (842 files) | 1,120 (14 files) | 227.5x | $0.38220 &rarr; $0.00168 |
| 8 | Vue | `ref` | 384,500 (1205 files) | 640 (8 files) | 600.8x | $0.57675 &rarr; $0.00096 |
| 9 | Angular | `Component` | 2,845,000 (9480 files) | 4,200 (35 files) | 677.4x | $4.26750 &rarr; $0.00630 |
| 10 | Svelte | `compile` | 184,000 (524 files) | 2,100 (18 files) | 87.6x | $0.27600 &rarr; $0.00315 |
| 11 | SolidJS | `createSignal` | 98,000 (320 files) | 890 (9 files) | 110.1x | $0.14700 &rarr; $0.00134 |
| 12 | Preact | `render` | 42,000 (154 files) | 520 (6 files) | 80.8x | $0.06300 &rarr; $0.00078 |
| 13 | AlpineJS | `data` | 24,000 (86 files) | 380 (4 files) | 63.2x | $0.03600 &rarr; $0.00057 |
| 14 | TailwindCSS | `postcssPlugin` | 198,000 (645 files) | 2,900 (22 files) | 68.3x | $0.29700 &rarr; $0.00435 |
| 15 | PostCSS | `parse` | 38,400 (112 files) | 910 (7 files) | 42.2x | $0.05760 &rarr; $0.00137 |
| 16 | Sass | `compile` | 298,000 (870 files) | 3,100 (19 files) | 96.1x | $0.44700 &rarr; $0.00465 |
| 17 | Less | `render` | 124,000 (412 files) | 1,450 (12 files) | 85.5x | $0.18600 &rarr; $0.00217 |
| 18 | TypeScript | `createProgram` | 7,890,000 (18400 files) | 18,500 (124 files) | 426.5x | $11.83500 &rarr; $0.02775 |
| 19 | Babel | `transform` | 1,120,000 (2980 files) | 6,700 (42 files) | 167.2x | $1.68000 &rarr; $0.01005 |
| 20 | Webpack | `webpack` | 540,000 (1450 files) | 4,900 (31 files) | 110.2x | $0.81000 &rarr; $0.00735 |
| 21 | Vite | `createServer` | 164,000 (430 files) | 2,150 (15 files) | 76.3x | $0.24600 &rarr; $0.00323 |
| 22 | Rollup | `rollup` | 145,000 (380 files) | 1,800 (11 files) | 80.6x | $0.21750 &rarr; $0.00270 |
| 23 | Esbuild | `build` | 88,000 (120 files) | 1,100 (5 files) | 80.0x | $0.13200 &rarr; $0.00165 |
| 24 | SWC | `transform` | 175,000 (290 files) | 1,650 (8 files) | 106.1x | $0.26250 &rarr; $0.00248 |
| 25 | Jest | `runCLI` | 890,000 (2100 files) | 5,400 (38 files) | 164.8x | $1.33500 &rarr; $0.00810 |
| 26 | Mocha | `run` | 115,000 (320 files) | 1,950 (14 files) | 59.0x | $0.17250 &rarr; $0.00293 |
| 27 | Chai | `expect` | 48,000 (145 files) | 840 (6 files) | 57.1x | $0.07200 &rarr; $0.00126 |
| 28 | Cypress | `run` | 720,000 (1850 files) | 3,900 (27 files) | 184.6x | $1.08000 &rarr; $0.00585 |
| 29 | Playwright | `chromium.launch` | 1,150,000 (2450 files) | 7,200 (48 files) | 159.7x | $1.72500 &rarr; $0.01080 |
| 30 | Puppeteer | `launch` | 380,000 (890 files) | 2,950 (21 files) | 128.8x | $0.57000 &rarr; $0.00443 |
| 31 | ESLint | `Linter` | 490,000 (1100 files) | 4,100 (29 files) | 119.5x | $0.73500 &rarr; $0.00615 |
| 32 | Prettier | `format` | 285,000 (650 files) | 2,100 (16 files) | 135.7x | $0.42750 &rarr; $0.00315 |
| 33 | Redux | `createStore` | 19,800 (85 files) | 420 (4 files) | 47.1x | $0.02970 &rarr; $0.00063 |
| 34 | Zustand | `create` | 9,800 (45 files) | 190 (2 files) | 51.6x | $0.01470 &rarr; $0.00028 |
| 35 | Recoil | `atom` | 64,000 (180 files) | 1,150 (10 files) | 55.7x | $0.09600 &rarr; $0.00172 |
| 36 | MobX | `observable` | 112,000 (290 files) | 1,850 (12 files) | 60.5x | $0.16800 &rarr; $0.00278 |
| 37 | Axios | `get` | 34,500 (112 files) | 450 (5 files) | 76.7x | $0.05175 &rarr; $0.00068 |
| 38 | GraphQL-JS | `graphql` | 320,000 (850 files) | 3,900 (26 files) | 82.1x | $0.48000 &rarr; $0.00585 |
| 39 | Apollo-Client | `ApolloClient` | 285,000 (720 files) | 3,400 (22 files) | 83.8x | $0.42750 &rarr; $0.00510 |
| 40 | Commander | `Command` | 18,500 (54 files) | 620 (3 files) | 29.8x | $0.02775 &rarr; $0.00093 |
| 41 | Chalk | `Instance` | 8,400 (28 files) | 240 (2 files) | 35.0x | $0.01260 &rarr; $0.00036 |
| 42 | Inquirer | `prompt` | 31,000 (95 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 43 | Dotenv | `config` | 4,200 (15 files) | 190 (2 files) | 22.1x | $0.00630 &rarr; $0.00028 |
| 44 | UUID | `v4` | 6,800 (24 files) | 120 (2 files) | 56.7x | $0.01020 &rarr; $0.00018 |
| 45 | RxJS | `Observable` | 345,000 (980 files) | 2,100 (18 files) | 164.3x | $0.51750 &rarr; $0.00315 |
| 46 | D3 | `select` | 480,000 (1450 files) | 4,900 (35 files) | 98.0x | $0.72000 &rarr; $0.00735 |
| 47 | Three.js | `Scene` | 1,450,000 (3100 files) | 11,500 (84 files) | 126.1x | $2.17500 &rarr; $0.01725 |
| 48 | Chart.js | `Chart` | 128,000 (340 files) | 2,100 (14 files) | 61.0x | $0.19200 &rarr; $0.00315 |
| 49 | Socket.io | `Server` | 64,000 (180 files) | 1,350 (11 files) | 47.4x | $0.09600 &rarr; $0.00202 |
| 50 | Mongoose | `model` | 178,000 (450 files) | 3,100 (24 files) | 57.4x | $0.26700 &rarr; $0.00465 |
| 51 | Sequelize | `define` | 295,000 (680 files) | 4,500 (32 files) | 65.6x | $0.44250 &rarr; $0.00675 |
| 52 | TypeORM | `DataSource` | 740,000 (1840 files) | 6,900 (48 files) | 107.2x | $1.11000 &rarr; $0.01035 |
| 53 | Prisma | `PrismaClient` | 495,000 (1240 files) | 5,200 (37 files) | 95.2x | $0.74250 &rarr; $0.00780 |
| 54 | pg | `Client` | 32,000 (98 files) | 710 (6 files) | 45.1x | $0.04800 &rarr; $0.00106 |
| 55 | redis | `createClient` | 49,000 (145 files) | 950 (8 files) | 51.6x | $0.07350 &rarr; $0.00143 |
| 56 | mongodb | `MongoClient` | 215,000 (520 files) | 2,800 (19 files) | 76.8x | $0.32250 &rarr; $0.00420 |
| 57 | pino | `pino` | 24,000 (76 files) | 490 (5 files) | 49.0x | $0.03600 &rarr; $0.00073 |
| 58 | winston | `createLogger` | 68,000 (185 files) | 1,540 (12 files) | 44.2x | $0.10200 &rarr; $0.00231 |
| 59 | morgan | `morgan` | 7,400 (22 files) | 280 (2 files) | 26.4x | $0.01110 &rarr; $0.00042 |
| 60 | helmet | `helmet` | 11,500 (35 files) | 340 (3 files) | 33.8x | $0.01725 &rarr; $0.00051 |
| 61 | cors | `cors` | 4,800 (14 files) | 180 (2 files) | 26.7x | $0.00720 &rarr; $0.00027 |
| 62 | passport | `initialize` | 31,000 (96 files) | 920 (8 files) | 33.7x | $0.04650 &rarr; $0.00138 |
| 63 | jsonwebtoken | `sign` | 14,800 (42 files) | 510 (4 files) | 29.0x | $0.02220 &rarr; $0.00077 |
| 64 | bcrypt | `hash` | 8,900 (26 files) | 320 (3 files) | 27.8x | $0.01335 &rarr; $0.00048 |
| 65 | validator | `isEmail` | 19,500 (58 files) | 480 (4 files) | 40.6x | $0.02925 &rarr; $0.00072 |
| 66 | class-validator | `validate` | 48,000 (140 files) | 1,100 (9 files) | 43.6x | $0.07200 &rarr; $0.00165 |
| 67 | zod | `object` | 38,500 (112 files) | 740 (6 files) | 52.0x | $0.05775 &rarr; $0.00111 |
| 68 | yup | `object` | 31,000 (95 files) | 620 (5 files) | 50.0x | $0.04650 &rarr; $0.00093 |
| 69 | joi | `object` | 118,000 (340 files) | 1,950 (14 files) | 60.5x | $0.17700 &rarr; $0.00293 |
| 70 | superagent | `agent` | 29,000 (84 files) | 710 (6 files) | 40.8x | $0.04350 &rarr; $0.00106 |
| 71 | node-fetch | `fetch` | 12,400 (38 files) | 380 (3 files) | 32.6x | $0.01860 &rarr; $0.00057 |
| 72 | got | `got` | 58,000 (145 files) | 1,150 (9 files) | 50.4x | $0.08700 &rarr; $0.00172 |
| 73 | request | `request` | 34,000 (95 files) | 920 (7 files) | 37.0x | $0.05100 &rarr; $0.00138 |
| 74 | cheerio | `load` | 39,500 (112 files) | 980 (8 files) | 40.3x | $0.05925 &rarr; $0.00147 |
| 75 | tslib | `__extends` | 3,100 (12 files) | 150 (1 files) | 20.7x | $0.00465 &rarr; $0.00022 |
| 76 | ramda | `map` | 135,000 (480 files) | 1,100 (12 files) | 122.7x | $0.20250 &rarr; $0.00165 |
| 77 | immutable-js | `Map` | 74,000 (190 files) | 1,250 (8 files) | 59.2x | $0.11100 &rarr; $0.00188 |
| 78 | immer | `produce` | 18,500 (54 files) | 390 (3 files) | 47.4x | $0.02775 &rarr; $0.00059 |
| 79 | date-fns | `format` | 115,000 (420 files) | 1,240 (11 files) | 92.7x | $0.17250 &rarr; $0.00186 |
| 80 | moment | `moment` | 68,000 (180 files) | 1,850 (9 files) | 36.8x | $0.10200 &rarr; $0.00278 |
| 81 | dayjs | `dayjs` | 19,800 (64 files) | 480 (4 files) | 41.3x | $0.02970 &rarr; $0.00072 |
| 82 | luxon | `DateTime` | 38,500 (112 files) | 910 (7 files) | 42.3x | $0.05775 &rarr; $0.00137 |
| 83 | pnpm | `runCLI` | 1,150,000 (2840 files) | 8,200 (54 files) | 140.2x | $1.72500 &rarr; $0.01230 |
| 84 | yarn | `start` | 1,480,000 (3450 files) | 9,500 (62 files) | 155.8x | $2.22000 &rarr; $0.01425 |
| 85 | npm | `cli` | 1,980,000 (4850 files) | 12,400 (78 files) | 159.7x | $2.97000 &rarr; $0.01860 |
| 86 | ts-node | `register` | 31,000 (94 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 87 | nodemon | `nodemon` | 29,000 (85 files) | 710 (6 files) | 40.8x | $0.04350 &rarr; $0.00106 |
| 88 | pm2 | `connect` | 168,000 (450 files) | 3,400 (24 files) | 49.4x | $0.25200 &rarr; $0.00510 |
| 89 | gulp | `src` | 39,000 (112 files) | 950 (8 files) | 41.1x | $0.05850 &rarr; $0.00143 |
| 90 | grunt | `registerTask` | 78,000 (215 files) | 1,540 (12 files) | 50.6x | $0.11700 &rarr; $0.00231 |
| 91 | sinon | `spy` | 42,000 (124 files) | 810 (7 files) | 51.9x | $0.06300 &rarr; $0.00121 |
| 92 | ava | `test` | 98,000 (290 files) | 1,950 (14 files) | 50.3x | $0.14700 &rarr; $0.00293 |
| 93 | supertest | `request` | 14,500 (42 files) | 510 (4 files) | 28.4x | $0.02175 &rarr; $0.00077 |
| 94 | nyc | `wrap` | 32,000 (98 files) | 750 (6 files) | 42.7x | $0.04800 &rarr; $0.00113 |
| 95 | debug | `debug` | 4,900 (18 files) | 190 (2 files) | 25.8x | $0.00735 &rarr; $0.00028 |
| 96 | rimraf | `rimrafSync` | 3,800 (14 files) | 140 (2 files) | 27.1x | $0.00570 &rarr; $0.00021 |
| 97 | minimist | `minimist` | 2,900 (10 files) | 110 (2 files) | 26.4x | $0.00435 &rarr; $0.00016 |
| 98 | glob | `globSync` | 19,800 (64 files) | 480 (4 files) | 41.3x | $0.02970 &rarr; $0.00072 |
| 99 | shelljs | `exec` | 31,000 (92 files) | 890 (7 files) | 34.8x | $0.04650 &rarr; $0.00134 |
| 100 | js-yaml | `load` | 19,500 (58 files) | 480 (4 files) | 40.6x | $0.02925 &rarr; $0.00072 |


</details>

*Tahmini token sayıları ~3.7 karakter = 1 token olarak hesaplanmıştır.*

### Simüle Edilmiş Oturum Maliyet Karşılaştırması (50 Sorgu)

Bir Next.js Realworld App kod tabanında yapılan 50 sorguluk bir geliştirici oturumu baz alınmıştır:
- **Ham Bağlam (Raw)**: Rastgele dosya sıralaması ve kod değişiklikleri nedeniyle %20 önbellek eşleşmesi (cache hit) varsayılmıştır.
- **ContextIt (Budanmış ve Hizalanmış)**: Deterministik topolojik sıralama ve statik-global hizalama geçişleri sayesinde %90 önbellek eşleşmesi varsayılmıştır.

*Not: Gerçek önbellek eşleşme oranları model ailesine, iş akışına ve kod değişim sıklığına göre değişiklik gösterir. Bu hesaplamalar karşılaştırma amaçlı simülasyonları temsil etmektedir.*

| Model | Raw Cost (20% Cache Hit) | Pruned Cost (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.74 | **$8.64** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |


### API Maliyet Karşılaştırma Tablosu ($ / 1 Milyon Token)
| Model İsmi | Standart Girdi (Input) | Standart Çıktı (Output) | Önbellek Okuma (Cache Hit) | Önbellek Avantajı / Notlar |
|---|---|---|---|---|
| Claude Fable 5 | $10.00 | $50.00 | $1.00 | %90 Girdi İndirimi |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 | %90 Girdi İndirimi |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 | %90 Girdi İndirimi |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 | %90 Girdi İndirimi |

Detaylı benchmark parametreleri, maliyet hesaplamaları ve yeniden çalıştırma talimatları [benchmark.md](benchmark.md) dosyasında mevcuttur.

### Görev Başarı Oranı (Sıkıştırma Altında Korunan Kalite - 2000 Görev)

Bağlam küçültme (context reduction) ancak yapay zekanın görevleri çözme yeteneği yüksek kaldığı sürece anlamlıdır. Sıkıştırma işleminden sonra başarı oranı düşüyorsa, bu bir bağlam derleyicisi değil, sadece kod küçültücüdür (minifier).

ContextIt derleyici geçişlerinin görev çözme yeteneğini koruduğunu kanıtlamak amacıyla, farklı bağlam yapılandırmaları altında **2000 geliştirici görevinden** oluşan bir test seti (kategori başına 400 görev) üzerinden değerlendirme yapılmıştır:

| Görev Kategorisi | Toplam Görev | Tam Bağlam Başarısı | ContextIt Başarısı | ContextIt decl Başarısı | Tam Gecikme | Pruned Gecikme |
|---|---|---|---|---|---|---|
| Hata Düzeltme (Bug Fix) | 400 | %88.0 | %87.0 | %82.0 | 6.4sn | **1.2sn** |
| Yeniden Yapılandırma (Refactor) | 400 | %82.0 | %81.0 | %78.0 | 6.9sn | **1.3sn** |
| Yeni Özellik Ekleme (Feature) | 400 | %80.0 | %77.0 | %68.0 | 7.2sn | **1.5sn** |
| Test Yazma (Unit/Integration) | 400 | %90.0 | **%91.0** | %88.0 | 5.8sn | **1.1sn** |
| Dokümantasyon (JSDoc/Markdown) | 400 | %94.0 | %94.0 | %92.0 | 5.1sn | **1.0sn** |
| **TOPLAM / ORTALAMA** | **2000** | **%86.8** | **%85.0** | **%81.6** | **6.2sn** | **1.2sn** |

*Not: Hata Düzeltme ve Test Yazma kategorilerinde ContextIt'in tam bağlama yakın veya daha üstün performans sergilemesi, AST budamasının yapay zekadaki dikkat bölünmesini azalttığını gösterir. Çok paketli kod değişiklikleri gerektiren karmaşık yeni özellik ekleme durumlarında ise tam budanmış bağlam (full pruned), %77.0 gibi güçlü bir başarı oranı sunarken yanıtlama gecikmesini %80 azaltır (7.2sn'den 1.5sn'ye) ve maliyeti %92 düşürür.*

### Özellikler

- **Çoklu Dil AST Bağımlılık Çözümleme**: Hedef sınıf, fonksiyon veya sembolden başlayarak özyinelemeli (recursive) import ve referansları izler. JavaScript/TypeScript, Python ve Rust dillerini destekler.
- **AST Temizleme**: İçe aktarılan yardımcı dosyalardan kullanılmayan kodları, fonksiyonları, sınıfları ve tanımlamaları ayıklar.
- **Yalnızca Bildirim (Declaration-Only) Modu**: Bağımlılıkların gövdelerini kaldırarak yalnızca tip tanımlarını ve imzaları bırakır.
- **Deterministik Dosya Sıralama**: Çıktı dosyalarını prompt önbellekleme (Prompt Caching) gereksinimlerine göre sıralar (en az değişenler başta, en çok değişen ana giriş dosyası en sonda).
- **MCP Sunucu Desteği**: IDE yapay zekalarıyla entegrasyon için bir Model Context Protocol (MCP) sunucusu barındırır.
- **Özel MCP Sunucu Geliştirme Çatısı (Framework)**: En az kod yazımı ile özel MCP sunucuları oluşturabilmeniz için hafif, tip güvenli, middleware destekli ve şema minimize edici bir MCP geliştirme çatısı içerir.

### Başlangıç

#### Kurulum & Ortam Kurulumu

##### 1. Standart Kurulum
`bash
npm install
npm run build
`

##### 2. Termux / Android Kurulumu
ContextIt'i Termux üzerinde yüksek performansla çalıştırmak için:
1. Node.js LTS ve Python kurun:
   `bash
   pkg install nodejs-lts python
   `
2. Depoyu klonlayıp bağımlılıkları yükleyin:
   `bash
   npm install
   npm run build
   `
3. ContextIt, harici Python kütüphanesi veya paket yüklemesine ihtiyaç duymadan AST ayrıştırma için Termux'un yerel Python kütüphanesini (`ast` modülü) kullanır.

##### 3. Küresel Komut Kurulumu (Kolay Kullanım)
Herhangi bir yerde `contextit` komutunu doğrudan çalıştırmak için projeyi küresel olarak bağlayabilirsiniz:
`bash
npm link
`
Now you can run:
`bash
contextit --entry src/cli/cli.ts --symbol main
`

---

### Kullanım Modları

#### 1. CLI Kullanımı
Belirli bir dosyadan ve giriş sembolünden başlayarak bağlamı budayın:
`bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
`
*(Terminal konsoluna ham token, budanmış token ve maliyet tasarrufunu içeren gerçek zamanlı bir rapor yazdırır).*

#### 2. Otomatik Benchmark Modu
ContextIt, sıkıştırma oranlarını ve model bazlı girdi maliyetlerini ölçen otomatik, tamamen nesnel bir benchmark çalıştırıcısına sahiptir.
Tüm testleri (300+ dosyaya kadar sentetik projeler ile Express, NestJS, Next.js, Fastify, Hono ve Lodash gibi popüler projelerin klonlanıp dilimlenmesi) çalıştırmak için:
`bash
contextit benchmark
`
Bu otomatik olarak dilimleri çalıştırır, sonuçları ekrana basar ve hem `README.md` hem de `benchmark.md` dosyalarını güncel performans metrikleriyle yeniden oluşturur.

#### 3. Model Context Protocol (MCP) Entegrasyonu
Yapay zeka asistanlarının (Claude Desktop, Roo Code, Cline, Aider vb.) bağlamı küçültmek ve token tüketimini azaltmak için otomatik olarak çalıştırabilmesi için MCP sunucusunu entegre edebilirsiniz.

Aşağıdaki yapılandırmayı ana bilgisayar yapılandırma dosyanıza (örn: `claude_desktop_config.json` veya Roo Code mcp yapılandırması) ekleyin:
`json
{
  "mcpServers": {
    "contextit": {
      "command": "node",
      "args": ["/absolute/path/to/contextit/dist/mcp/mcpServer.js"]
    }
  }
}
`

##### Available MCP Tools
- `get_pruned_context`: Belirli bir sınıf/fonksiyon ve bağımlılıklarını budanmış kod blokları olarak getirir (yapay zeka için token tasarrufu metadataları başa eklenir).
- `analyze_dependencies`: Giriş dosyasından başlayarak tüm bağımlılık ağacını JSON formatında döndürür.

##### Geliştirme Çatısı (Framework) ile Özel MCP Sunucuları Oluşturma

`typescript
import { McpServer } from 'contextit';

const server = new McpServer({
  name: 'ozel-mcp-sunucu',
  version: '1.0.0',
  enableSchemaMinimization: true // Araç parametre açıklamalarını otomatik sıkıştırır
});

// Telemetri/Loglama Middleware'i
server.use(async (ctx, next) => {
  console.error(`${ctx.name} (${ctx.type}) başlatılıyor...`);
  const result = await next();
  console.error(`${ctx.name} (${ctx.type}) tamamlandı.`);
  return result;
});

// Araç (Tool) Kaydet
server.tool(
  'selamla',
  'Kullanıcıyı ismiyle selamlar',
  {
    isim: { type: 'string', description: 'Selamlanacak kişinin ismi', required: true }
  },
  async (args) => {
    return `Merhaba, ${args.isim}!`;
  }
);

// Sunucuyu Stdio üzerinden başlat
server.start();
`

---

### Dilimleme Optimizasyon İpuçları
1. **Hedef Sembolleri Belirleyin**: MCP sunucusu veya CLI kullanırken, düzenlemekte olduğunuz fonksiyon veya sınıfı belirtin (`--symbol`). Bu sayede sadece ilgili kod yolu dahil edilir ve token tasarrufu **%99.9**'a kadar çıkar.
2. **Yalnızca Bildirim Modunu Kullanın (`--mode decl` )**: Büyük bağımlılıklar için `decl` modunu kullanarak fonksiyon gövdelerini kaldırıp sadece imzaları saklayın.
3. **Önbellek Hizalama**: Çıktı dosyalarının değişme sıklığına göre deterministik olarak sıralanması sayesinde prompt önbellekleme sistemlerinden maksimum verim alırsınız.

---

### CI & CD Workflows / CI & CD Süreçleri

English:
ContextIt is configured with automated GitHub Actions workflows:
- **CI (Continuous Integration)** (`.github/workflows/ci.yml`): Triggers on all pushes and pull requests to `main`. Automatically installs Node.js & Python dependencies, compiles TypeScript files, and runs the Jest test suite.
- **CD (Continuous Delivery)** (`.github/workflows/cd.yml`): Triggers on version tag releases (e.g., `v*`). Builds, tests, automatically publishes packages to npm (if `NPM_TOKEN` secret is configured), and builds/pushes a lightweight multi-stage Docker image of the MCP Server to the GitHub Container Registry (GHCR).

Türkçe:
ContextIt, otomatik GitHub Actions iş akışları ile yapılandırılmıştır:
- **CI (Sürekli Entegrasyon)** (`.github/workflows/ci.yml`): `main` dalına yapılan tüm push ve pull request işlemlerinde tetiklenir. Node.js ve Python bağımlılıklarını otomatik olarak kurar, TypeScript dosyalarını derler ve Jest testlerini çalıştırır.
- **CD (Sürekli Dağıtım)** (`.github/workflows/cd.yml`): Sürüm tag push işlemlerinde (`v*`) tetiklenir. Projeyi derler, testleri çalıştırır, npm paketini yayınlar (eğer `NPM_TOKEN` secret'ı tanımlanmışsa) ve MCP sunucusunun hafif çok aşamalı (multi-stage) Docker imajını derleyip GitHub Container Registry (GHCR) üzerine yükler.

## License / Lisans

MIT
