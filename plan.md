# ContextIt v2: MCP-Aware Context Compiler Uygulama Planı

**Deterministic Context Pipelines for MCP-based Agents**
*(MCP Tabanlı Ajanlar için Deterministik Bağlam Boru Hatları)*

ContextIt v2, LLM (başta Claude 3.5 Sonnet olmak üzere) etmenleri için tasarlanmış, kaynak kodları, araç şemalarını (Tool Schemas) ve görev tanımlarını (Task Descriptions) girdi olarak alıp optimize edilmiş bir **Ara Temsile (IR - Intermediate Representation)** derleyen **MCP-Aware Context Compiler (MCP-Uyumlu Bağlam Derleyicisi)** altyapısıdır.

---

## 🧠 Context IR Nedir ve Yapısı Nasıldır?

Bir derleyicinin kalbi Ara Temsildir (IR). ContextIt v2, kaynak kod deposunu, aktif MCP araç şemalarını ve geliştirici görevini aşağıdaki şemaya göre **Context IR** yapısına derler:

```json
{
  "metadata": {
    "fingerprint": "ctx://8f3a21c",
    "entryPoint": "src/main.ts",
    "targetSymbol": "bootstrap"
  },
  "task": {
    "instruction": "Fix bug in authentication token expiration logic"
  },
  "tools": [
    {
      "name": "read_file",
      "minimizedSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    }
  ],
  "graph": {
    "nodes": [
      { "id": "src/main.ts::bootstrap", "type": "function" },
      { "id": "src/auth/service.ts::AuthService", "type": "class" }
    ],
    "edges": [
      { "source": "src/main.ts::bootstrap", "target": "src/auth/service.ts::AuthService" }
    ]
  },
  "files": {
    "src/auth/service.ts": {
      "imports": [
        { "source": "./jwt", "specifiers": [{ "localName": "JwtHelper", "exportName": "JwtHelper" }] }
      ],
      "activeSymbols": ["AuthService"]
    }
  }
}
```

### Context IR Sayesinde:
*   **Ayrıştırılabilirlik (Separation of Concerns)**: Kaynak kod bağımlılıkları (`graph` ve `files`), araç şemaları (`tools`) ve görev tanımı (`task`) tek bir yapıda soyutlanır.
*   **Ölçülebilirlik (Measurability)**: Derleyicinin uygulayacağı her optimizasyon geçişi (pass) bu IR üzerinde çalışır ve çıktı token değişimleri bağımsız olarak ölçümlenebilir.

---

## ⚙️ Compiler & Optimizer Pipeline Scoping

Kapsam genişlemesini (scope creep) önlemek amacıyla, v2'nin ilk sürümünde çoklu model backend'leri yerine **tek ve güçlü bir optimizasyon hattına** odaklanılacaktır:

```
[Source Code + Tools + Task]
            ↓
    [Generic Context IR]
            ↓
    [Generic Optimizer]  ← (Schema Minimizer, Dependency Pruning, Cache Alignment Passes)
            ↓
    [Claude Backend]     ← (Claude 3.5 Sonnet Prompt Caching ve Attention yapılarına özel çıktı)
```

Bu sayede:
1.  Genel Ara Temsil (Context IR) ve Genel Optimizasyon Motoru mimarisi kurulur.
2.  İlk aşamada sadece **Claude Backend**'i tam performanslı hale getirilerek konsept kanıtlanır (Proof of Concept).
3.  İlerleyen sürümlerde `GPT Backend`, `Gemini Backend` veya `Open-weight Backend` modülleri kolayca bu boru hattına eklenebilir.

---

## 📅 Yol Haritası ve Fazlar

### 🛠️ Faz 1: Deterministic Cache Alignment Engine (Önbellek Hizalama)
*   **Deterministik Topolojik Sıralama**: Bağımlılık ağacındaki döngüleri çözüp, aynı seviyedeki dosyaları alfabetik olarak deterministik sıralayan algoritmanın yazılması.
*   **Dosya Rol Sınıflandırması**: Dosyaları kararlılık derecelerine göre sıralayarak en az değişenlerin üstte kalmasını sağlayan hizalama (alignment) geçişi.

### 📦 Faz 2: MCP Tool Schema Minimizer
*   **Anlamsal Şema Küçültücü**: MCP SDK'sı tarafından LLM'e kayıt edilen araç şemalarının JSON yapılarındaki `description` alanlarını optimize etme.
*   **Girdi Tipleri Sıkıştırması**: Parametre tiplerini ve şemalarını minimum token tüketecek şekilde sadeleştirme.

### ⚙️ Faz 3: Context Fingerprinting & Claude Layout Backend
*   **Context Fingerprinting Modülü**: Derlenen bağlam için `ctx://<sha256-prefix>` formatında deterministik parmak izi üreten ve bunu bağlam başlığına ekleyen sistem.
*   **Claude Layout Backend**: Claude 3.5 Sonnet'in prompt önbellekleme (prompt caching) sınırlarına ve dikkat (attention) yapısına uygun çıktı üretici modül.

### 🌐 Faz 4: Advanced MCP Server v2
*   Yeni MCP araçlarının eklenmesi:
    *   `compile_prompt_context`: Giriş sembolü, mod ve token bütçesi alarak derlenmiş, sıralanmış ve minimize edilmiş nihai prompt bağlamını döndürür.
    *   `get_cache_status`: Mevcut projenin tahmini cache durumunu ve hangi dosyaların cache'i bozduğunu raporlar.

### 📊 Faz 5: Ölçülebilir Optimizasyon Geçişleri ve Metrikleri
*   **Optimizasyon Adımlarının Ölçülmesi**: Her derleme adımının (Pass 1, Pass 2, Pass 3) ne kadar kazandırdığını ölçen bağımsız test suite'i:
    *   `Pass 1: Schema Minimizer` (Token kazanım hedefi: ~%10-%15)
    *   `Pass 2: Dependency Pruning` (Token kazanım hedefi: ~%60-%80)
    *   `Pass 3: Cache Alignment` (Önbellek kazanım hedefi: +%30-%50 cache reuse)
*   **Simüle Edilmiş Oturum Maliyet Analizi (CTO-Friendly)**: Belirli varsayımlarda elde edilen tahmini maliyet deltasını model bazında raporlayan simülasyon tablosu.

---

## 📈 Başarı Kriterleri (V2 Hedefleri)

| Hedef Metrik | Mevcut Durum (v1) | Hedeflenen Durum (v2) |
|---|---|---|
| **Cache Hit Oranı** | %40 - %60 (Sıralama değişkendi) | **%90'a varan cache hit** (Simüle edilmiş oturumlarda) |
| **Tool Schema Token Tüketimi** | ~1.5k token | **< 400 token** (%70+ sıkıştırma) |
| **Bağlam Bütçeleme Başarısı** | Manuel parametre ayarı | **Otomatik ve Dinamik Kırpma** (Target Budget) |
| **Ölçülebilir Geçiş Raporlaması** | Yok | **Var (Her pass adımının token kazanım yüzdesi)** |
| **Fingerprint & Reproducibility** | Yok | **Var (`ctx://` formatında imzalama)** |

---

## 🚀 Anthropic Başvurusu İçin Kilit Noktalar
Anthropic ve açık kaynak geliştiricileri için bu projenin temel değeri sadece maliyet tasarrufu değil, **bağlam boru hatlarının deterministik, öngörülebilir ve açık standartlara dayalı (MCP-native) hale getirilmesidir**. ContextIt, LLM ajan ekosistemini büyütecek açık kaynaklı bir altyapı standart adayıdır.
