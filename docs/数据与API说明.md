# 数据与 API 说明：报告能不能跑出「产品报告」结果

## 一、你现在的目标

用户在「新建报告」页填写：报告标题、核心 ASIN、竞品 ASIN、市场站点等 → 提交后，系统能跑出一份**可用的产品/竞品分析报告**。

---

## 二、当前系统实际在做什么

### 2.1 已经有的（能跑出结果）

| 环节 | 状态 | 说明 |
|------|------|------|
| **大模型 API** | ✅ 已接好 | 使用 **OpenRouter**（可选 Gemini/Claude/GPT 等），按你选的模型生成报告各章节 |
| **流程** | ✅ 打通 | 新建报告 → 提交 → 后端按章节调大模型 → 流式输出 → 生成 Markdown 报告并保存 |

只要配置了 **`OPENROUTER_API_KEY`**，用户提交后**一定能得到一份报告**。  
这份报告的内容来源是：**仅靠你填的 ASIN、市场、标题等文字 + 大模型“推断”**，没有拉取任何实时亚马逊或网页数据。

### 2.2 还没有的（你之前用的那套数据）

| 数据来源 | 你之前用的 | 当前系统 |
|----------|------------|----------|
| **亚马逊数据** | RapidAPI（亚马逊相关 API） | ❌ 未接入 | 没有价格、评论、评分等真实数据 |
| **网页数据** | ScrapingBee | ❌ 未接入 | 没有根据网页内容做分析 |

也就是说：

- **「能跑出一个结果」**：✅ 可以，靠大模型就行，配好 OpenRouter 即可。
- **「按你之前在 RapidAPI + ScrapingBee 上用的那样，用上真实亚马逊 + 网页数据」**：❌ 目前还缺这两块 API 的接入。

---

## 三、要达成「和之前一样用上真实数据」还缺什么

1. **大模型 API**  
   - 已有：OpenRouter。  
   - 你只需：在环境变量里配置 `OPENROUTER_API_KEY`。

2. **亚马逊数据 API（RapidAPI）**  
   - 缺：在生成报告前，根据「核心 ASIN + 竞品 ASIN + 市场」去调 RapidAPI，拿到产品详情/价格/评论等。  
   - 需要：  
     - 你在 RapidAPI 用的那个「亚马逊数据」API 的 **名称或文档链接**；  
     - 以及 **RapidAPI Key**（和对应 Host，如 `xxx.p.rapidapi.com`）。

3. **网页抓取 API（ScrapingBee）**  
   - 缺：在生成报告前，用 ScrapingBee 抓取你指定的网页，把内容交给大模型做分析。  
   - 需要：  
     - **ScrapingBee API Key**；  
     - 以及「要抓哪些 URL」的规则（例如：固定几个站、或从某处读取 URL 列表）。

---

## 四、接下来可以怎么做

- **只想要「能跑出报告」**：  
  配置好 `OPENROUTER_API_KEY` 即可，无需改代码。报告内容会基于大模型推断，没有真实亚马逊/网页数据。

- **想要「和之前一样用上 RapidAPI + ScrapingBee」**：  
  需要在后端接入这两个 API，并在生成报告时把取到的数据塞进发给大模型的提示词里。  
  我可以根据你提供的：  
  - RapidAPI 上具体用的哪个亚马逊 API（名称或文档）；  
  - ScrapingBee 的用法（例如只抓固定几个 URL，还是从某处配置）；  
  帮你写出：  
  - 环境变量说明（如 `RAPIDAPI_KEY`、`SCRAPINGBEE_API_KEY` 等）；  
  - 后端调用 RapidAPI / ScrapingBee 的代码骨架；  
  - 在现有「新建报告」流程里，在调用大模型前先拉取数据并写入提示词的改动方式。

---

## 五、已接入的代码（配置 Key 即可用）

- **RapidAPI（亚马逊）**：已接好。在 `.env.local` 里配置 `RAPIDAPI_KEY` 和（如需要）`RAPIDAPI_AMAZON_HOST`。报告生成时会按「核心 ASIN + 竞品 ASIN」拉取产品数据并写入大模型提示词。若你用的不是 `real-time-amazon-data.p.rapidapi.com`，可改 `RAPIDAPI_AMAZON_HOST`；若接口路径不是 `/product-details?asin=...&country=...`，需要改 `lib/server/data-sources.ts` 里 `fetchAmazonDataFromRapidAPI` 的 URL。
- **ScrapingBee（网页）**：已接好。配置 `SCRAPINGBEE_API_KEY` 后，在「新建报告」页的「参考网页 URL」里填网址（每行一个，最多 5 个），提交时会抓取这些页面并注入提示词。

总结：**只配 OpenRouter** 就能跑出报告；**再配 RapidAPI + ScrapingBee** 就能在报告里用上你之前的亚马逊数据和网页抓取结果。
