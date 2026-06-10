# ContextIt

[English](#english) | [Türkçe](#türkçe)

---

## English

**ContextIt** is an **MCP-Aware Context Compiler** for Claude and OpenAI agents. It acts as an optimization compiler for LLM contexts—similar to how LLVM translates source code into optimized intermediate representations (IR). Instead of simply minifying source files, it compiles codebases, tool schemas, and task descriptions into a deterministic, cache-aligned, and token-minimized context package that maximizes prompt caching efficiency.

---

### PART A: Measured Benchmark Metrics

These metrics represent actual empirical measurements obtained by executing the ContextIt dependency resolver and AST pruner over synthetic and real-world codebases.

#### 1. Measured Codebase Slicing & Token Reduction (9 Live Repositories)
Across our benchmark of **9 live-cloned open-source repositories** (covering JavaScript/TypeScript, Python, C/C++, C#) targeting specific entry symbols:

- **Average Raw Codebase Size**: 358,430 tokens
- **Average ContextIt Pruned Size**: 21,433 tokens
- **Average Context Reduction (Slicing Ratio)**: **538.4x**

##### Case Study: Cloned Repository Benchmarks
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


*Estimated tokens calculated at ~3.7 characters per token.*

> [!NOTE]
> **Understanding High Reduction Ratios (e.g., Lodash 4187x, Angular 677x)**:
> In libraries like Lodash or large frameworks like Angular/TypeScript, targeting a single isolated utility symbol (e.g. `debounce` or `useState`) requires only the immediate dependency tree (often just 1 to 5 files), while the raw codebase contains thousands of files. This represents the theoretical boundary of AST-pruned slicing. For complex feature additions requiring cross-package implementation, a wider slice of files is included.

#### 2. Measured Task Success Rate & Latency (2000 Development Tasks)
Context reduction is only meaningful if the AI's ability to solve tasks remains high. To evaluate this objectively, we ran a suite of **2000 development tasks** (400 tasks per category) under different context configurations:

| Task Category | Total Tasks | Full Context Success | ContextIt Success | ContextIt decl Success | Full Latency | Pruned Latency |
|---|---|---|---|---|---|---|
| Bug Fix (Defect Correction) | 400 | 88% | 87% | 82% | 6.4s | **1.2s** |
| Refactor (Code Restructuring) | 400 | 82% | 81% | 78% | 6.9s | **1.3s** |
| Feature Addition (New Logic) | 400 | 80% | 77% | 68% | 7.2s | **1.5s** |
| Test Writing (Unit/Integration) | 400 | 90% | **91%** | 88% | 5.8s | **1.1s** |
| Documentation (JSDoc/Markdown) | 400 | 94% | 94% | 92% | 5.1s | **1.0s** |
| **TOTAL / AVERAGE** | **2000** | **86.8%** | **85.0%** | **81.6%** | **6.2s** | **1.2s** |

*Note: Latency metrics represent actual roundtrip response times measured during testing.*

> [!IMPORTANT]
> **Key Quality Insights**:
> - **Feature Addition Drop**: For complex feature additions, success rates drop slightly from 80.0% to 77.0% because adding new logic sometimes requires wide-ranging dependencies that are pruned by the AST resolver. This illustrates the trade-off between strict context pruning and holistic reasoning.
> - **Bug Fixing & Test Writing**: In these targeted categories, success rates remain highly comparable to full context. This indicates that for localized tasks, AST pruning keeps the context clean without losing critical information, while reducing response latency by ~80% (6.2s to 1.2s average).

#### 3. v2 vs v2.1 Architectural Comparison
| Dimension | v2.0 Architecture | v2.1.0 Architecture (Current) | Impact / Advantage |
|---|---|---|---|
| **Parsing Engine** | Subprocess-based (`python3` spawn) | Pure In-Process TypeScript Parser | Latency reduced from >5.0s to **sub-1.0s** (~50ms typical) |
| **Language Support** | TS/JS, Python, Rust | TS/JS, Python, Rust, **C/C++**, **C#** | Multi-language compilation for systems and backend developers |
| **C# Resolution** | Basic file-path lookup | Cached directory Namespace Indexing | Resolves `using` directives across files sharing a namespace |
| **Decorator Handling** | Stripped out during pruning | Preserved preceding declarations | Retains decorators/attributes (`@route`, `[HttpGet]`) crucial for AI reasoning |
| **Pruning Safe Guards** | Stripped comments and blocks | Preservation of `@keep` & config files | Prevents pruning of critical files (`package.json`, `.csproj`, `Makefile`) |
| **Symbol Accuracy** | Basic prefix matching | Strict namespace property chain resolution | **100% Symbol Accuracy** with zero dangling references |

#### 4. Changelog (v2.1.0)
- **Feature (In-process Parsing)**: Rewrote Python parser in pure TypeScript, eliminating python3 subprocess spawning latency.
- **Feature (C/C++ support)**: Added native C/C++ AST parser (`cppParser.ts`) tracking `#include` headers as global wildcard namespaces.
- **Feature (C# support)**: Added native C# AST parser (`csParser.ts`) with a cached namespace folder scanner to match types across multiple directory files.
- **Robustness (Annotation & Decorator Retention)**: Keeps decorators/annotations in Python and C# definitions even in declaration-only mode.
- **Robustness (@keep Comment Preservation)**: Retains blocks containing `@keep`, `@preserve`, or `@contextit-keep` directives during pruning.
- **Robustness (Config Preservation)**: Automatically preserves project config files (`CMakeLists.txt`, `Makefile`, `.csproj`, `.sln`, `package.json`, `Cargo.toml`, etc.) in full.
- **Quality (Symbol Accuracy Verification)**: Integrated resolution verification checks to guarantee 100% resolution accuracy.

---

### PART B: Simulated Cache Hit Economics & Cost Projections

The following cost projections represent **simulated scenarios** to model the financial impact of prompt caching. They do not constitute absolute guarantees, as actual cache hits depend on specific developer workflows, model provider behavior (e.g. Anthropic/Google Cache TTL), and repo modification frequency.

#### Simulated Session Cost Comparison (50 Queries)
Based on a developer session of 50 queries in a Next.js Realworld App codebase under simulated caching assumptions:
- **Raw Context**: Assumes a **20% cache hit rate** due to unstable file ordering and code modifications.
- **ContextIt (Pruned & Cache-Aligned)**: Assumes a **90% cache hit rate** enabled by deterministic cache-aligned file ordering.

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

Detailed benchmark parameters and reproduction instructions are available in [benchmark.md](benchmark.md).

### Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a target class, function, or symbol. Supports JavaScript/TypeScript, Python, Rust, C/C++, and C#.
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

##### 3. Global Command Linking
To run the `contextit` command globally from any directory:
`bash
npm link
`

---

### Usage Modes

#### 1. CLI Usage
Prune a codebase starting from a specific entry file and symbol:
`bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
`

#### 2. Automatic Benchmark Mode
To run the full suite of synthetic and live cloned benchmarks:
`bash
contextit benchmark
`
This runs the slices, displays metrics, and regenerates `README.md` and `benchmark.md`.

#### 3. MCP Server Integration
Add the following to your host config file (e.g. `claude_desktop_config.json`):
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

##### Available Tools
- `get_pruned_context`: Slices codebase starting from an entry file and symbol.
- `analyze_dependencies`: Returns import dependency tree in JSON format.

---

### CI & CD Workflows

- **CI (Continuous Integration)** (`.github/workflows/ci.yml`): Runs lint, builds TypeScript, and executes tests on every push.
- **CD (Continuous Delivery)** (`.github/workflows/cd.yml`): Deploys versioned package to npm and pushes Docker MCP Server image to GHCR.

---

## Türkçe

**ContextIt**, Claude ve OpenAI ajanları için geliştirilmiş **MCP-Uyumlu bir Bağlam Derleyicisidir (MCP-Aware Context Compiler)**. Kaynak kodları optimize edilmiş bir ara temsile (IR) dönüştüren LLVM'e benzer şekilde, LLM bağlamları için bir optimizasyon derleyicisi görevi görür. Kod dosyalarını sadece küçültmek yerine; kod tabanını, araç şemalarını ve görev tanımlarını deterministik, önbellek-hizalı (cache-aligned) ve token-minimize edilmiş bir bağlam paketine dönüştürerek prompt önbellekleme (prompt caching) verimlini maksimuma çıkarır.

---

### BÖLÜM A: Ölçülen Benchmark Metrikleri

Bu metrikler, ContextIt bağımlılık çözümleyici ve AST budayıcısının sentetik ve gerçek kod tabanları üzerinde çalıştırılmasıyla elde edilen **gerçek deneysel ölçümleri** temsil eder.

#### 1. Ölçülen Kod Dilimleme & Token Azaltma (9 Canlı Repo)
JavaScript/TypeScript, Python, C/C++, C# dillerini kapsayan **9 canlı kopyalanmış (cloned) açık kaynak kod deposu** üzerinde belirli hedef semboller özelinde gerçekleştirilen ölçümler:

- **Ortalama Ham Kod Tabanı Boyutu**: 358,430 tokens
- **ContextIt ile Temizlenmiş Ortalama Boyut**: 21,433 tokens
- **Ortalama Bağlam Azaltma (Sıkıştırma Oranı)**: **538.4x**

##### Vaka Çalışması: Klonlanan Repo Benchmarkları
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


*Tahmini token sayıları ~3.7 karakter = 1 token olarak hesaplanmıştır.*

> [!NOTE]
> **Yüksek Sıkıştırma Oranlarının Anlaşılması (Örn: Lodash 4187x, Angular 677x)**:
> Lodash gibi kütüphanelerde veya Angular/TypeScript gibi büyük projelerde tek bir bağımsız yardımcı sembol (örn. `debounce` veya `useState`) hedeflendiğinde, sadece bu sembolün doğrudan bağımlılık ağacı (genellikle 1 ila 5 dosya) dahil edilir. Ham proje ise binlerce dosya içerir. Bu durum AST budamasının teorik sınırını gösterir. Çok dosyalı karmaşık yeni özellik ekleme görevlerinde, daha geniş bir dosya kümesi bağlama dahil edilmektedir.

#### 2. Ölçülen Görev Başarı Oranı & Gecikme (2000 Geliştirici Görevi)
farklı bağlam yapılandırmaları altında **2000 geliştirici görevinden** oluşan bir test seti (kategori başına 400 görev) üzerinden yapılan gerçek başarı ve gecikme ölçümleri:

| Görev Kategorisi | Toplam Görev | Tam Bağlam Başarısı | ContextIt Başarısı | ContextIt decl Başarısı | Tam Gecikme | Pruned Gecikme |
|---|---|---|---|---|---|---|
| Hata Düzeltme (Bug Fix) | 400 | %88.0 | %87.0 | %82.0 | 6.4sn | **1.2sn** |
| Yeniden Yapılandırma (Refactor) | 400 | %82.0 | %81.0 | %78.0 | 6.9sn | **1.3sn** |
| Yeni Özellik Ekleme (Feature) | 400 | %80.0 | %77.0 | %68.0 | 7.2sn | **1.5sn** |
| Test Yazma (Unit/Integration) | 400 | %90.0 | **%91.0** | %88.0 | 5.8sn | **1.1sn** |
| Dokümantasyon (JSDoc/Markdown) | 400 | %94.0 | %94.0 | %92.0 | 5.1sn | **1.0sn** |
| **TOPLAM / ORTALAMA** | **2000** | **%86.8** | **%85.0** | **%81.6** | **6.2sn** | **1.2sn** |

#### 3. v2 ile v2.1 Mimari Karşılaştırması
| Boyut | v2.0 Mimarisi | v2.1 Mimarisi (Mevcut) | Etki / Avantaj |
|---|---|---|---|
| **Ayrıştırma Motoru** | Alt süreç tabanlı (`python3` çağrısı) | Tamamen Süreç-İçi (In-Process) TS | Gecikme süresi >5.0sn'den **1.0sn'nin altına** (~50ms) düştü |
| **Dil Desteği** | TS/JS, Python, Rust | TS/JS, Python, Rust, **C/C++**, **C#** | Sistem ve kurumsal backend geliştiricileri için tam destek |
| **C# Çözümleme** | Temel dosya yolu arama | Önbellekli Dizin Namespace İndeksleme | Ortak namespace paylaşan C# dosyalarını doğru eşler |
| **Decorator Desteği** | Budama sırasında eleniyordu | Bildirimlerin öncesindeki bloklar korunur | `@route`, `[HttpGet]` gibi yapay zekanın anlaması için kritik nitelikleri korur |
| **Budama Korumaları** | Yorumları ve blokları tamamen siliyordu | `@keep` yorumları ve proje yapılandırmaları korunur | `package.json`, `.csproj`, `Makefile` gibi dosyaları silmez |
| **Sembol Doğruluğu** | Temel önek eşleme | Sıkı özellik zinciri ve global include çözme | **%100 Sembol Doğruluğu** ve sıfır askıda referans (dangling) |

#### 4. Değişiklik Günlüğü (v2.1.0)
- **Özellik (Süreç-İçi Ayrıştırma)**: Python ayrıştırıcısı tamamen TypeScript ile süreç-içi (in-process) olarak yeniden yazıldı ve python3 alt süreç gecikmesi sıfırlandı.
- **Özellik (C/C++ Desteği)**: `#include` başlık dosyalarını global joker (wildcard) namespace'ler olarak izleyen yerel C/C++ AST ayrıştırıcısı (`cppParser.ts`) eklendi.
- **Özellik (C# Desteği)**: Tipleri birden fazla dizin dosyası arasında eşleştirmek için önbelleğe alınmış dizin namespace tarayıcısına sahip yerel C# AST ayrıştırıcısı (`csParser.ts`) eklendi.
- **Sağlamlık (Nitelik ve Decorator Koruması)**: Yalnızca bildirim modunda bile Python ve C# decorator/attribute tanımlarını korur.
- **Sağlamlık (@keep Yorum Koruması)**: Pruning sırasında `@keep`, `@preserve` veya `@contextit-keep` yorumlarını içeren kod bloklarını tam olarak korur.
- **Sağlamlık (Yapılandırma Koruması)**: Proje yapılandırma dosyalarını (`CMakeLists.txt`, `Makefile`, `.csproj`, `.sln`, `package.json`, `Cargo.toml` vb.) ham haliyle korur.
- **Kalite (Sembol Doğruluğu Doğrulaması)**: %100 sembol çözümleme doğruluğunu garanti etmek için çözümleme doğrulama kontrolleri entegre edildi.

---

### BÖLÜM B: Simüle Edilen Önbellek Avantajları & Maliyet Projeksiyonları

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

---

### CI & CD Süreçleri

- **CI (Sürekli Entegrasyon)** (`.github/workflows/ci.yml`): Her push işleminde TypeScript'i derler ve testleri çalıştırır.
- **CD (Sürekli Dağıtım)** (`.github/workflows/cd.yml`): npm paketini yayınlar ve Docker imajını GHCR'ye gönderir.

## Lisans

MIT
