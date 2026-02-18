# n8n 参考：搜索查询生成提示词

> 用于「根据产品关键词 → 生成 Google / YouTube 搜索查询 → 再通过搜索 API 得到链接 → ScrapingBee 抓内容」的流程。实现自动发现参考网站与 YouTube 视频时可直接复用。

---

## 一、RapidAPI 评论接口（已在本系统实现）

- **URL**: `https://real-time-amazon-data.p.rapidapi.com/product-reviews`
- **方法**: GET
- **Query 参数**: `asin`, `page`, `country`
- **鉴权**: Header `X-RapidAPI-Key`、`X-RapidAPI-Host: real-time-amazon-data.p.rapidapi.com`

本系统已在 `lib/server/data-sources.ts` 中实现：
- `fetchProductReviewsFromRapidAPI(asin, country, { maxReviews })`：单 ASIN 分页拉评论
- `fetchCombinedReviewsFromRapidAPI(asinList, marketplace, { maxPerAsin })`：多 ASIN 合并为一段混合文本

---

## 二、Google 搜索查询生成（用于找参考网站）

**用途**：根据产品关键词，生成约 10 条 Google 搜索词，用于后续搜索 API 得到「分析、讨论、技术类」网页链接。

**策略**：
1. **站内搜索**：用 `site:` 在优质论坛（如 Reddit, Garage Journal, Hobby-Machinist, Bladeforums）搜索。
2. **广泛搜索**：全网搜索，用否定词 `-buy`, `-price` 过滤销售信息。

**规则**：使用 `site:` 时禁止用英文引号，必须用简短通用词（如 "buffing wheel", "aluminum polishing"），不要用完整长关键词。

**占位符**：`{{ $json.product_keywords }}` → 在本系统实现时替换为从产品信息提炼的 `product_keywords`（例如 "6 inch spiral sewn buffing wheel"）。

**输出格式**：JSON，包含 `queries` 数组。

```
你是一名专业的研究策略师。基于以下产品关键词，请生成 10 个 Google 搜索查询词。

我们的目标是找到【分析、讨论和技术内容】。
我们将混合使用两种策略：
1. 【站内搜索】: 使用 "site:" 操作符在已知的优质论坛 (Reddit, Garage Journal) 中搜索。
2. 【广泛搜索】: 在全网搜索，并使用否定词 ("-buy", "-price") 过滤销售信息。

【【【！！！最重要规则！！！】】】
当且仅当使用 "site:" (例如 "site:reddit.com") 时:
1. 【禁止】使用 "..." (英文引号)。
2. 【必须】使用更简短、更通用的相关词 (例如 "buffing wheel", "aluminum polishing", "polishing compound") 来搜索，而不是使用完整的长关键词。

请严格按照以下 JSON 格式返回一个包含查询词的数组：
{
  "queries": [
    "site:reddit.com buffing wheel aluminum review",
    "site:garagejournal.com buffing wheel compound discussion",
    "site:hobby-machinist.com polishing aluminum spiral sewn",
    "site:bladeforums.com polishing compounds guide",
    "{{product_keywords}} vs loose sewn comparison -buy -price -shop",
    "{{product_keywords}} technical analysis -buy -price -store",
    "best buffing compound for spiral sewn wheel forum",
    "{{product_keywords}} problems OR issues discussion -shop",
    "{{product_keywords}} independent review -site:powertecproducts.com -site:eastwood.com -site:amazon.com",
    "common mistakes buffing aluminum -buy"
  ]
}

--- 产品关键词 ---
{{product_keywords}}
(例如: 6 inch spiral sewn buffing wheel)
```

**实现时**：用 LLM 调用上述提示（将 `{{product_keywords}}` 替换为实际关键词），解析返回的 `queries`，再调用搜索 API（如 SerpApi、Google Custom Search）得到 URL 列表，最后用 ScrapingBee 抓取正文。

---

## 三、YouTube 搜索查询生成（用于找参考视频）

**用途**：根据产品关键词，生成约 10 条「仅限 YouTube」的搜索词，用于后续得到视频链接（再抓字幕）。

**规则**：每条查询**必须**以 `site:youtube.com` 开头。

**内容类型**：测评、开箱、如何使用、对比、长期测试等。

**占位符**：`{{ $json.product_keywords }}` → 在本系统替换为 `product_keywords`。

**输出格式**：JSON，包含 `queries` 数组。

```
你是一名专业的【YouTube】研究策略师。你收到了关于一个产品的关键词：

【关键词】: {{product_keywords}}

你的任务是生成 10 个【多样化】的 Google 搜索查询词。
【【【！！！最重要规则！！！】】】:
每一个查询词【必须】以 "site:youtube.com" 开头，以确保只搜索 YouTube！

请专注于视频内容，例如：
- 测评 (Review)
- 开箱 (Unboxing)
- 如何使用 (How-to / Tutorial)
- 对比 (vs / Comparison)
- 长期测试 (Durability Test)

请严格按照以下 JSON 格式返回一个包含查询词的数组：
{
  "queries": [
    "site:youtube.com {{product_keywords}} review",
    "site:youtube.com {{product_keywords}} unboxing",
    "site:youtube.com how to use {{product_keywords}}",
    "site:youtube.com {{product_keywords}} vs competitor",
    "site:youtube.com {{product_keywords}} durability test",
    "site:youtube.com best polishing compound for {{product_keywords}}",
    "site:youtube.com {{product_keywords}} setup and use",
    "site:youtube.com polishing aluminum with {{product_keywords}}",
    "site:youtube.com {{product_keywords}} problems",
    "site:youtube.com {{product_keywords}} tips and tricks"
  ]
}
```

**实现时**：用 LLM 得到 `queries` → 用搜索 API 执行这些查询得到 YouTube 视频 URL → 用 ScrapingBee 或 YouTube 字幕 API 抓取字幕，拼成 `COMBINED_TRANSCRIPT`。

---

## 四、与本系统实现计划的关系

| 数据块 | 状态 | 说明 |
|--------|------|------|
| **Products Reviews** | ✅ 已实现 | `fetchCombinedReviewsFromRapidAPI`，同 host、product-reviews、asin/page/country |
| **Reference Sites（自动发现）** | 待实现 | 用「二」的提示词生成 queries → 搜索 API 取 URL → ScrapingBee 抓正文 |
| **Reference YouTube（自动发现）** | 待实现 | 用「三」的提示词生成 queries → 搜索 API 取视频 URL → 抓字幕 |

如需再补充 n8n 里「执行搜索」用的具体 API（如 SerpApi 的 endpoint/key）或「抓 YouTube 字幕」的方式，可以继续发截图或链接，我再对接到实现计划里。
