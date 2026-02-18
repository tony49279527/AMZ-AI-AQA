# 实现计划：从 n8n 迁移到本系统

> 目标：用户提交表单后，在后台完成数据抓取、数据整理、大模型报告生成，并呈现在用户的报告详情页；行为与你在 n8n 上做出的报告一致。

---

## 一、整体流程（提交 → 展示）

```
用户在前端「新建报告」页填写表单并提交
        ↓
前端：用 FormData 提交（含 JSON 字段 + 可选的两个文件：退货报告、人群画像）
        ↓
后端 POST /api/reports/generate
  ├ 1. 解析表单：主品/竞品 ASIN、站点、报告语言、模型、核心提示词、网站数、视频数、上传文件等
  ├ 2. 数据抓取与整理（见下）
  ├ 3. 组装 6 块数据 + 替换提示词模板中的占位符
  ├ 4. 调用 OpenRouter：System Prompt + User Prompt（一次请求，流式或非流式）
  ├ 5. 将生成的报告正文写入 report_<id>.md，写入 metadata
  └ 6. SSE 推流：init → log → progress → complete（或 error）
        ↓
前端：消费 SSE，展示进度/日志，完成后跳转或展示「报告已生成，查看报告」
        ↓
用户打开报告详情页：展示已保存的 Markdown 报告
```

---

## 二、需要解决的事项（按模块）

### 2.1 前端

| 序号 | 事项 | 当前状态 | 要做的事 |
|------|------|----------|----------|
| F1 | **上传文件真正传到后端** | 退货报告、人群画像仅在前端 state，提交时 **未随请求发送** | 改为 `FormData` 提交：除 JSON 字段外，追加 `returnsFile`、`audienceFile` 两个 file 字段（有则传，无则省略）；或先 base64 放入 JSON（需改后端收 JSON+base64） |
| F2 | **报告语言** | 有 `language`（如 zh），但提示词里需要「报告语言」的**展示名**（如「英文」「德语」） | 前端增加「报告语言」选择（与站点可联动：美国站默认英文），提交时传 `reportLanguage`（如 "英文"）供后端写入提示词 |
| F3 | **提交方式** | 当前 `Content-Type: application/json` + `JSON.stringify(body)` | 若采用 FormData：`body` 为 FormData，其中 `payload` 字段为 JSON 字符串（title、coreAsins、competitorAsins、marketplace、reportLanguage、model、websiteCount、youtubeCount、customPrompt、webUrls 等）；`returnsFile`、`audienceFile` 为 File |
| F4 | **进度与完成态** | 已有 SSE：init / progress / log / complete / error | 后端改为「单次报告生成」后，complete 只触发一次，可保留 progress 为 0→50（数据抓取）→100（报告写出）；前端若目前按「章节数」展示，需改为「阶段」展示（抓取中 / 生成中 / 完成） |

### 2.2 后端：数据抓取与整理

| 序号 | 数据块 | 当前状态 | 要做的事 / 待解决问题 |
|------|--------|----------|------------------------|
| B1 | **Products Info（混合）** | 已有 RapidAPI 拉取产品详情，按 ASIN 逐条 | 保持现有逻辑，将**所有 ASIN**（主品+竞品）的产品信息拼成**一段混合文本**，带 `[ASIN: xxx]` 等标识，作为 `PRODUCTS_INFO_TEXT` |
| B2 | **Products Reviews（混合）** | ✅ 已实现 | 已接入 RapidAPI `product-reviews`（`asin`、`page`、`country`），见 `lib/server/data-sources.ts`：`fetchProductReviewsFromRapidAPI`、`fetchCombinedReviewsFromRapidAPI`。每 ASIN 最多 100 条，分页拉取后拼成 `COMBINED_REVIEWS` |
| B3 | **Reference Sites（通用）** | 部分 | **阶段一**：用户填的 `webUrls` + ScrapingBee。**阶段二**：用 n8n 的「Google 搜索查询生成」提示词（见 `docs/n8n参考-搜索查询生成提示词.md`）→ LLM 生成 queries → 搜索 API 得 URL → ScrapingBee 抓正文 |
| B4 | **Reference YouTube（通用）** | 部分 | n8n 的「YouTube 搜索查询生成」提示词已记录在 `docs/n8n参考-搜索查询生成提示词.md`。实现：生成 queries → 搜索 API 得视频 URL → 抓字幕（ScrapingBee 或 YouTube 字幕 API）→ `COMBINED_TRANSCRIPT` |
| B5 | **退货报告（Retours）** | ❌ 未实现 | 后端接收上传文件（CSV/TXT/Excel），解析为纯文本；无上传则传 `NO_RETURN_REPORT`。**实现**：支持 multipart 的 `returnsFile` 或 JSON 内 base64；解析 CSV（可 Node 用 csv-parse 或简单 split）、TXT（直接 utf8）、Excel（需库如 xlsx）→ 拼接成一段文字 |
| B6 | **人群画像（Persona）** | ❌ 未实现 | 同 B5，解析后作为 `PERSONA_REPORT_TEXT`，无则 `NO_PERSONA_REPORT` |

### 2.3 后端：报告生成逻辑（与 n8n 一致）

| 序号 | 事项 | 当前状态 | 要做的事 |
|------|------|----------|----------|
| B7 | **提示词模板** | 当前按 7 个固定章节、每章一条 LLM 请求 | 改为：使用你确定的 **System Prompt** + **User Prompt** 模板（见 `docs/报告提示词模板.md`），占位符替换为：`REPORT_LANGUAGE`、`MAIN_ASINS`、`COMPETITOR_ASINS`、`PRODUCTS_INFO_TEXT`、`COMBINED_REVIEWS`、`COMBINED_WEB_CONTENT`、`COMBINED_TRANSCRIPT`、`RETURN_REPORT_TEXT`、`PERSONA_REPORT_TEXT`、`CUSTOM_PROMPT` |
| B8 | **单次调用** | 当前 7 次 chat/completions | 一次 chat/completions（可 stream），得到**整份报告**，写入 `report_<id>.md`；metadata 中 dataFiles 仍可保留「主品/竞品/网站/YouTube」等描述，便于前端展示 |
| B9 | **请求体与限流** | 当前 `request.json()` | 若前端改 FormData，后端需 `request.formData()`，从中取 `payload`（JSON）和 `returnsFile`、`audienceFile`（File），再执行业务逻辑；限流与鉴权保持不变 |
| B10 | **取消** | 已有 `request.signal` | 在数据抓取与单次 LLM 调用中传递 `signal`，用户取消时 abort，并通过 SSE 发送 error 事件 |

### 2.4 报告展示与数据来源

| 序号 | 事项 | 当前状态 | 要做的事 |
|------|------|----------|----------|
| D1 | **报告详情页** | 已有报告详情页，从文件系统读 `report_<id>.md` 并渲染 | 无需大改；生成逻辑改为「一整份报告」后，该文件即为一篇完整 Markdown，现有渲染即可展示 |
| D2 | **数据来源展示** | 需展示「用到了哪些数据」：链接、条数、字符数 | 见 `docs/数据来源展示与持久化方案.md`：报告详情页「数据源」Tab 展示参考网站/YouTube 链接列表、产品/评论/退货/人群的条数与字符数 |
| D3 | **抓取资料入库** | 当前无库，抓取结果未持久化 | 新增数据库（推荐 SQLite）与表 `report_sources`；报告生成时每抓一块写入一条（含 content、char_count、url/asin）；供展示 + **问答系统**基于「报告+抓取资料」作答 |

---

## 三、实现阶段建议

### 阶段一：最小可测闭环（先跑通「一篇完整报告」）

**目标**：提交后能生成一份与 n8n 结构一致的报告（可先不包含所有数据源），便于你用手上数据做一次端到端测试。

1. **后端**
   - 支持 **FormData**：从 `formData.get("payload")` 取 JSON，从 `formData.get("returnsFile")` / `formData.get("audienceFile")` 取文件（有则解析为文本，无则 `NO_*`）。
   - **文件解析**：先支持 **TXT + CSV**（Excel 可阶段二加），解析出文本。
   - **数据块**：  
     - Products Info：继续用现有 RapidAPI 产品详情，拼成 `PRODUCTS_INFO_TEXT`。  
     - Reviews：若当前 RapidAPI 无评论接口，先传**空字符串**或简短说明「暂无评论数据」，保证模板不报错。  
     - Reference Sites：继续用用户填的 `webUrls` + ScrapingBee，拼成 `COMBINED_WEB_CONTENT`。  
     - Reference YouTube：先传空字符串，占位。  
     - 退货/人群：有上传则解析后传入，无则 `NO_RETURN_REPORT` / `NO_PERSONA_REPORT`。
   - **报告生成**：用 `docs/报告提示词模板.md` 的 System + User 模板做占位符替换，**单次**调用 OpenRouter，流式或非流式均可；将返回的整份报告写入 `report_<id>.md`，并写 metadata。
   - **SSE**：保留 init / log / progress / complete（/ error），log 中可输出「正在拉取产品信息」「正在抓取网页」「正在生成报告」等。

2. **前端**
   - 提交改为 **FormData**：`payload` = JSON 字符串（含 title、coreAsins、competitorAsins、marketplace、reportLanguage、model、websiteCount、youtubeCount、customPrompt、webUrls 等），有文件时追加 `returnsFile`、`audienceFile`。
   - 增加「报告语言」选择（如 中文+英文、中文+德语 等），提交字段 `reportLanguage`（展示名）。
   - 完成态：收到 complete 后跳转报告详情或显示「查看报告」按钮，与现有一致。

**交付**：你能在本地提交表单（含主品/竞品 ASIN、站点、报告语言、核心提示词、可选 webUrls、可选退货/人群文件），得到一篇由 OpenRouter 按你框架生成的报告，并在报告详情页看到完整内容。

---

### 阶段二：补全数据源（更接近 n8n）

1. **评论**：确认 RapidAPI 或其它接口能拉评论；实现按 ASIN 拉取（每 ASIN 最多 100 条），拼成 `COMBINED_REVIEWS` 并注入模板。
2. **参考网站**：若需要「按关键词自动找 N 个网站」，再接入搜索/发现逻辑（例如 SerpApi、或固定列表配置），再 ScrapingBee 抓取并提取正文。
3. **参考 YouTube**：确定 n8n 里视频链接与字幕的来源后，在本系统接同一或等价 API，拼成 `COMBINED_TRANSCRIPT`。
4. **Excel 上传**：人群/退货报告支持 .xlsx/.xls 解析为文本。

---

### 阶段三：体验与健壮性

- 进度条阶段化（抓取 → 生成）。
- 错误分类：某数据源失败时仅该块为空或占位，不阻塞整份报告；SSE 中 log 明确提示「评论拉取失败，已跳过」等。
- 超时与重试：对 RapidAPI/ScrapingBee/OpenRouter 设置合理超时与重试，避免长时间挂起。

---

## 四、技术点小结

| 类别 | 要点 |
|------|------|
| **前端** | FormData 提交（payload + returnsFile + audienceFile）；报告语言选择；进度按阶段展示 |
| **后端** | formData 解析；CSV/TXT（及后续 Excel）解析；6 块数据组装；System/User 模板替换；单次 OpenRouter 调用；SSE 与 signal 取消 |
| **数据** | Products Info 已有；Reviews 待接口确认；Reference Sites 现有 webUrls+ScrapingBee；Reference YouTube 待接口确认；退货/人群为上传解析 |
| **报告** | 一篇完整 Markdown，写入 `report_<id>.md`，详情页直接复用现有展示 |

---

## 五、接下来建议

1. **你先确认两件事**：  
   - n8n 里**评论**是用哪个 API（RapidAPI 哪个接口、或其它）？  
   - **YouTube 视频链接 + 字幕**是用什么方式拿到的（ScrapingBee 抓某页、还是 YouTube API、还是其它）？  
   这样阶段二可以精准接入。

2. **按阶段一实现**：先做 FormData + 文件解析 + 现有产品信息 + 现有 webUrls + 退货/人群 + 单次提示词模板调用 + 报告写入与展示，不做评论与 YouTube，用你手头数据跑通一篇报告。

3. **联调与测试**：用你之前在 n8n 用过的同一批输入（主品/竞品 ASIN、核心提示词、可选文件），在本系统提交，对比生成的报告与 n8n 输出，再迭代。

如果你愿意，下一步我可以按「阶段一」直接给出前端改 FormData 的修改点和后端 `route.ts` 的拆分与伪代码（或具体 diff），方便你一次改完再测。
