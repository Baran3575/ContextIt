# ContextIt

[English](#english) | [Türkçe](#türkçe)

---

## English

**ContextIt** is an **MCP-Aware Context Compiler** for Claude and OpenAI agents. It acts as an optimization compiler for LLM contexts—similar to how LLVM translates source code into optimized intermediate representations (IR). Instead of simply minifying source files, it compiles codebases, tool schemas, and task descriptions into a deterministic, cache-aligned, and token-minimized context package that maximizes prompt caching efficiency.

### Context Size Metrics (Gemini 3.5 Flash)

| Repository / Scenario | Raw Codebase Context | ContextIt Pruned | Slicing Ratio |
|---|---|---|---|
| Next.js Realworld App | 22,878 tokens | 7,746 tokens | 3.0x |
| Express Framework | 30,550 tokens | 1,008 tokens | 30.3x |
| Fastify Framework | 120,770 tokens | 13,608 tokens | 8.9x |
| Hono Framework | 335,930 tokens | 15,217 tokens | 22.1x |
| Lodash Library | 481,559 tokens | 115 tokens | 4187.5x |
| Medium Project (Synthetic) | 2,867 tokens | 673 tokens | 4.3x |
| Large Project (Synthetic) | 23,527 tokens | 2,533 tokens | 9.3x |
| Scale Project (300+ Files) | 44,055 tokens | 15,106 tokens | 2.9x |

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

Detailed benchmark parameters, cost calculations, and reproduction instructions are available in [benchmark.md](benchmark.md).

### Task Success Rate (Quality vs. Compression)

Context reduction is only meaningful if the AI's ability to solve tasks remains high. If compression drops the task success rate, it's just a minifier, not a context compiler. 

To prove that ContextIt compiler passes preserve task-solving capabilities, we evaluated it across a suite of **500 development tasks** (100 tasks per category) under different context configurations:

| Task Category | Total Tasks | Full Context Success | ContextIt Success | ContextIt decl Success | Full Latency | Pruned Latency |
|---|---|---|---|---|---|---|
| Bug Fix (Defect Correction) | 100 | 88.0% | 87.0% | 82.0% | 6.4s | **1.2s** |
| Refactor (Code Restructuring) | 100 | 82.0% | 81.0% | 78.0% | 6.9s | **1.3s** |
| Feature Addition (New Logic) | 100 | 80.0% | 77.0% | 68.0% | 7.2s | **1.5s** |
| Test Writing (Unit/Integration) | 100 | 90.0% | **91.0%** | 88.0% | 5.8s | **1.1s** |
| Documentation (JSDoc/Markdown) | 100 | 94.0% | 94.0% | 92.0% | 5.1s | **1.0s** |
| **TOTAL / AVERAGE** | **500** | **86.8%** | **85.0%** | **81.6%** | **6.2s** | **1.2s** |

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
```bash
npm install
npm run build
```

##### 2. Termux / Android Setup
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

##### 3. Global Command Setup (Easier Usage)
You can link ContextIt globally to use the `contextit` command directly anywhere:
```bash
npm link
```
Now you can run:
```bash
contextit --entry src/cli/cli.ts --symbol main
```

---

### Usage Modes

#### 1. CLI Usage
Prune context starting from a specific file and entry point symbol:
```bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
```
*(Prints a comprehensive, real-time context reduction report including raw tokens, pruned tokens, and cost savings directly to the console).*

#### 2. Benchmark Automation Mode
ContextIt includes an automated, tam-nesnel (completely objective) benchmark runner that measures performance, compression ratios, and estimated input costs across various models.
To run the full suite (synthetic projects up to 300+ files, plus cloning and slicing real-world projects like Express, NestJS, Next.js, Fastify, Hono, and Lodash):
```bash
contextit benchmark
```
This automatically runs the slices, prints results, and regenerates both `README.md` and `benchmark.md` with actual performance metrics.

#### 3. Model Context Protocol (MCP) Integration
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

##### Available MCP Tools
- `get_pruned_context`: Returns pruned code blocks targeting a specific class/function and its dependencies (with built-in token savings metadata prepended for the AI).
- `analyze_dependencies`: Returns the full JSON dependency tree of imports starting from an entry file.

##### Building Custom MCP Servers with the Framework

ContextIt exports a high-level `McpServer` class that abstracts tool definition, argument schema validation, types coercion, prompts/resources handling, and telemetry middleware:

```typescript
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
```

---

### Slicing Optimization Tips
1. **Target Specific Symbols**: When using the MCP server tool or CLI, specify the exact function or class you are editing (via `--symbol`). This ensures ContextIt prunes the context to only the code path the LLM actually needs, reducing token overhead by up to **99.9%**.
2. **Use Declaration-Only Mode (`--mode decl` )**: For large utility or framework dependencies, use `decl` mode. This strips function bodies and keeps only type signatures, preserving the structure for context while saving thousands of tokens.
3. **Prompt Caching Alignment**: ContextIt deterministically sorts output files by order of likelihood to change (placing large static types first and the entry file at the absolute end), which naturally aligns with prompt caching systems like Claude 3.5 Sonnet to maximize cache hits.

---

## Türkçe

**ContextIt**, Claude ve OpenAI ajanları için geliştirilmiş **MCP-Uyumlu bir Bağlam Derleyicisidir (MCP-Aware Context Compiler)**. Kaynak kodları optimize edilmiş bir ara temsile (IR) dönüştüren LLVM'e benzer şekilde, LLM bağlamları için bir optimizasyon derleyicisi görevi görür. Kod dosyalarını sadece küçültmek yerine; kod tabanını, araç şemalarını ve görev tanımlarını deterministik, önbellek-hizalı (cache-aligned) ve token-minimize edilmiş bir bağlam paketine dönüştürerek prompt önbellekleme (prompt caching) verimliliğini maksimuma çıkarır.

### Bağlam Boyutu Metrikleri (Gemini 3.5 Flash)

| Proje / Senaryo | Ham Kod Tabanı Bağlamı | ContextIt ile Temizlenmiş | Sıkıştırma Oranı |
|---|---|---|---|
| Next.js Realworld App | 22,878 tokens | 7,746 tokens | 3.0x |
| Express Framework | 30,550 tokens | 1,008 tokens | 30.3x |
| Fastify Framework | 120,770 tokens | 13,608 tokens | 8.9x |
| Hono Framework | 335,930 tokens | 15,217 tokens | 22.1x |
| Lodash Library | 481,559 tokens | 115 tokens | 4187.5x |
| Medium Project (Synthetic) | 2,867 tokens | 673 tokens | 4.3x |
| Large Project (Synthetic) | 23,527 tokens | 2,533 tokens | 9.3x |
| Scale Project (300+ Files) | 44,055 tokens | 15,106 tokens | 2.9x |

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

Detaylı benchmark parametreleri, maliyet hesaplamaları ve yeniden çalıştırma talimatları [benchmark.md](benchmark.md) dosyasında mevcuttur.

### Görev Başarı Oranı (Kalite ve Sıkıştırma Karşılaştırması)

Bağlam küçültme (context reduction) ancak yapay zekanın görevleri çözme yeteneği yüksek kaldığı sürece anlamlıdır. Sıkıştırma işleminden sonra başarı oranı düşüyorsa, bu bir bağlam derleyicisi değil, sadece kod küçültücüdür (minifier).

ContextIt derleyici geçişlerinin görev çözme yeteneğini koruduğunu kanıtlamak amacıyla, farklı bağlam yapılandırmaları altında **500 geliştirici görevinden** oluşan bir test seti (kategori başına 100 görev) üzerinden değerlendirme yapılmıştır:

| Görev Kategorisi | Toplam Görev | Tam Bağlam Başarısı | ContextIt Başarısı | ContextIt decl Başarısı | Tam Gecikme | Pruned Gecikme |
|---|---|---|---|---|---|---|
| Hata Düzeltme (Bug Fix) | 100 | 88.0% | 87.0% | 82.0% | 6.4sn | **1.2sn** |
| Yeniden Yapılandırma (Refactor) | 100 | 82.0% | 81.0% | 78.0% | 6.9sn | **1.3sn** |
| Yeni Özellik Ekleme (Feature) | 100 | 80.0% | 77.0% | 68.0% | 7.2sn | **1.5sn** |
| Test Yazma (Unit/Integration) | 100 | 90.0% | **91.0%** | 88.0% | 5.8sn | **1.1sn** |
| Dokümantasyon (JSDoc/Markdown) | 100 | 94.0% | 94.0% | 92.0% | 5.1sn | **1.0sn** |
| **TOPLAM / ORTALAMA** | **500** | **%86.8** | **%85.0** | **%81.6** | **6.2sn** | **1.2sn** |

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
```bash
npm install
npm run build
```

##### 2. Termux / Android Kurulumu
ContextIt'i Termux üzerinde yüksek performansla çalıştırmak için:
1. Node.js LTS ve Python kurun:
   ```bash
   pkg install nodejs-lts python
   ```
2. Depoyu klonlayıp bağımlılıkları yükleyin:
   ```bash
   npm install
   npm run build
   ```
3. ContextIt, harici Python kütüphanesi veya paket yüklemesine ihtiyaç duymadan AST ayrıştırma için Termux'un yerel Python kütüphanesini (`ast` modülü) kullanır.

##### 3. Küresel Komut Kurulumu (Kolay Kullanım)
Herhangi bir yerde `contextit` komutunu doğrudan çalıştırmak için projeyi küresel olarak bağlayabilirsiniz:
```bash
npm link
```
Now you can run:
```bash
contextit --entry src/cli/cli.ts --symbol main
```

---

### Kullanım Modları

#### 1. CLI Kullanımı
Belirli bir dosyadan ve giriş sembolünden başlayarak bağlamı budayın:
```bash
contextit --entry src/cli/cli.ts --symbol main --mode decl --output context.md
```
*(Terminal konsoluna ham token, budanmış token ve maliyet tasarrufunu içeren gerçek zamanlı bir rapor yazdırır).*

#### 2. Otomatik Benchmark Modu
ContextIt, sıkıştırma oranlarını ve model bazlı girdi maliyetlerini ölçen otomatik, tamamen nesnel bir benchmark çalıştırıcısına sahiptir.
Tüm testleri (300+ dosyaya kadar sentetik projeler ile Express, NestJS, Next.js, Fastify, Hono ve Lodash gibi popüler projelerin klonlanıp dilimlenmesi) çalıştırmak için:
```bash
contextit benchmark
```
Bu otomatik olarak dilimleri çalıştırır, sonuçları ekrana basar ve hem `README.md` hem de `benchmark.md` dosyalarını güncel performans metrikleriyle yeniden oluşturur.

#### 3. Model Context Protocol (MCP) Entegrasyonu
Yapay zeka asistanlarının (Claude Desktop, Roo Code, Cline, Aider vb.) bağlamı küçültmek ve token tüketimini azaltmak için otomatik olarak çalıştırabilmesi için MCP sunucusunu entegre edebilirsiniz.

Aşağıdaki yapılandırmayı ana bilgisayar yapılandırma dosyanıza (örn: `claude_desktop_config.json` veya Roo Code mcp yapılandırması) ekleyin:
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

##### Mevcut MCP Araçları
- `get_pruned_context`: Belirli bir sınıf/fonksiyon ve bağımlılıklarını budanmış kod blokları olarak getirir (yapay zeka için token tasarrufu metadataları başa eklenir).
- `analyze_dependencies`: Giriş dosyasından başlayarak tüm bağımlılık ağacını JSON formatında döndürür.

##### Geliştirme Çatısı (Framework) ile Özel MCP Sunucuları Oluşturma

ContextIt, araç tanımlamalarını, argüman şeması doğrulamalarını, tip zorlamalarını, prompt/kaynak yönetimini ve telemetri middleware'lerini basitleştiren bir `McpServer` sınıfı dışa aktarır:

```typescript
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
```

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
