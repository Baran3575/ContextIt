# ContextIt

[English](#english) | [Türkçe](#türkçe)

---

## English

**ContextIt** is an **MCP-Aware Context Compiler** for Claude and OpenAI agents. It acts as an optimization compiler for LLM contexts—similar to how LLVM translates source code into optimized intermediate representations (IR). Instead of simply minifying source files, it compiles codebases, tool schemas, and task descriptions into a deterministic, cache-aligned, and token-minimized context package that maximizes prompt caching efficiency.

### Context Size Metrics (Gemini 3.5 Flash)

| Repository / Scenario | Raw Codebase Context | ContextIt Pruned | Slicing Ratio |
|---|---|---|---|
| Next.js Realworld App | 22,878 tokens | 7,726 tokens | 3.0x |
| Express Framework | 30,550 tokens | 988 tokens | 30.9x |
| Fastify Framework | 120,770 tokens | 13,588 tokens | 8.9x |
| Hono Framework | 335,930 tokens | 15,197 tokens | 22.1x |
| Lodash Library | 481,559 tokens | 96 tokens | 5016.2x |
| Medium Project (Synthetic) | 2,867 tokens | 654 tokens | 4.4x |
| Large Project (Synthetic) | 23,527 tokens | 2,513 tokens | 9.4x |
| Scale Project (300+ Files) | 44,055 tokens | 15,087 tokens | 2.9x |

*Estimated tokens calculated at ~3.7 characters per token.*

### Simulated Session Cost Comparison (50 Queries)

Based on a developer session of 50 queries in a Next.js Realworld App codebase under specific caching assumptions:
- **Raw Context**: Assumes a 20% cache hit rate due to random file ordering and code changes.
- **ContextIt (Pruned & Cache-Aligned)**: Assumes a 90% cache hit rate enabled by deterministic ordering and static-global alignment passes.

*Note: Actual cache hits vary based on model family, workflow, and repo churn rate. These calculations represent simulated scenarios for comparison.*

| Model | Raw Cost (20% Cache Hit) | Pruned Cost (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.73 | **$8.65** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |


Detailed benchmark parameters, cost calculations, and reproduction instructions are available in [benchmark.md](benchmark.md).

### Features

- **Multi-Language AST Dependency Resolution**: Traces recursive imports and references starting from a target class, function, or symbol. Supports JavaScript/TypeScript, Python, and Rust.
- **AST Pruning**: Strips out unused code, functions, classes, and declarations from imported utility files.
- **Declaration-Only Mode**: Removes function and method bodies from resolved dependencies, leaving only type definitions and signatures.
- **Deterministic File Sorting**: Organizes output files deterministically to align with Prompt Caching requirements.
- **MCP Server Support**: Implements a Model Context Protocol (MCP) server for integration with IDE agents.

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
| Next.js Realworld App | 22,878 tokens | 7,726 tokens | 3.0x |
| Express Framework | 30,550 tokens | 988 tokens | 30.9x |
| Fastify Framework | 120,770 tokens | 13,588 tokens | 8.9x |
| Hono Framework | 335,930 tokens | 15,197 tokens | 22.1x |
| Lodash Library | 481,559 tokens | 96 tokens | 5016.2x |
| Medium Project (Synthetic) | 2,867 tokens | 654 tokens | 4.4x |
| Large Project (Synthetic) | 23,527 tokens | 2,513 tokens | 9.4x |
| Scale Project (300+ Files) | 44,055 tokens | 15,087 tokens | 2.9x |

*Tahmini token sayıları ~3.7 karakter = 1 token olarak hesaplanmıştır.*

### Simüle Edilmiş Oturum Maliyet Karşılaştırması (50 Sorgu)

Bir Next.js Realworld App kod tabanında yapılan 50 sorguluk bir geliştirici oturumu baz alınmıştır:
- **Ham Bağlam (Raw)**: Rastgele dosya sıralaması ve kod değişiklikleri nedeniyle %20 önbellek eşleşmesi (cache hit) varsayılmıştır.
- **ContextIt (Budanmış ve Hizalanmış)**: Deterministik topolojik sıralama ve statik-global hizalama geçişleri sayesinde %90 önbellek eşleşmesi varsayılmıştır.

*Not: Gerçek önbellek eşleşme oranları model ailesine, iş akışına ve kod değişim sıklığına göre değişiklik gösterir. Bu hesaplamalar karşılaştırma amaçlı simülasyonları temsil etmektedir.*

| Model | Raw Cost (20% Cache Hit) | Pruned Cost (90% Cache Hit) | Savings | % Saved |
|---|---|---|---|---|
| Claude Fable 5 | $9.38 | $0.73 | **$8.65** | 92% |
| Claude Opus 4.8 | $4.69 | $0.37 | **$4.32** | 92% |
| Claude Sonnet 4.6 | $2.81 | $0.22 | **$2.59** | 92% |
| Gemini 3.5 Flash | $1.41 | $0.11 | **$1.30** | 92% |


Detaylı benchmark parametreleri, maliyet hesaplamaları ve yeniden çalıştırma talimatları [benchmark.md](benchmark.md) dosyasında mevcuttur.

### Özellikler

- **Çoklu Dil AST Bağımlılık Çözümleme**: Hedef sınıf, fonksiyon veya sembolden başlayarak özyinelemeli (recursive) import ve referansları izler. JavaScript/TypeScript, Python ve Rust dillerini destekler.
- **AST Temizleme**: İçe aktarılan yardımcı dosyalardan kullanılmayan kodları, fonksiyonları, sınıfları ve tanımlamaları ayıklar.
- **Yalnızca Bildirim (Declaration-Only) Modu**: Bağımlılıkların gövdelerini kaldırarak yalnızca tip tanımlarını ve imzaları bırakır.
- **Deterministik Dosya Sıralama**: Çıktı dosyalarını prompt önbellekleme (Prompt Caching) gereksinimlerine göre sıralar (en az değişenler başta, en çok değişen ana giriş dosyası en sonda).
- **MCP Sunucu Desteği**: IDE yapay zekalarıyla entegrasyon için bir Model Context Protocol (MCP) sunucusu barındırır.

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

---

### Dilimleme Optimizasyon İpuçları
1. **Hedef Sembolleri Belirleyin**: MCP sunucusu veya CLI kullanırken, düzenlemekte olduğunuz fonksiyon veya sınıfı belirtin (`--symbol`). Bu sayede sadece ilgili kod yolu dahil edilir ve token tasarrufu **%99.9**'a kadar çıkar.
2. **Yalnızca Bildirim Modunu Kullanın (`--mode decl` )**: Büyük bağımlılıklar için `decl` modunu kullanarak fonksiyon gövdelerini kaldırıp sadece imzaları saklayın.
3. **Önbellek Hizalama**: Çıktı dosyalarının değişme sıklığına göre deterministik olarak sıralanması sayesinde prompt önbellekleme sistemlerinden maksimum verim alırsınız.

## Lisans

MIT
