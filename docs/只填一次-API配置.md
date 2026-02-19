# 只填一次，一直用

**你就给这两个 API Key，填进 `.env.local` 一次，后面不用再改。**

| 变量名 | 用途 | 去哪拿 |
|--------|------|--------|
| **OPENROUTER_API_KEY** | 报告生成 + 智能问答（用大模型） | https://openrouter.ai 注册 → Keys 里复制 |
| **SCRAPINGBEE_API_KEY** | 参考网页 + YouTube 搜索与字幕 | https://www.scrapingbee.com 注册 → API Key 里复制 |

**操作：**

1. 在项目里复制一份配置：
   ```bash
   cp .env.example .env.local
   ```
2. 打开 `.env.local`，只填这两行（别的不用动）：
   ```
   OPENROUTER_API_KEY=sk-or-你的key
   SCRAPINGBEE_API_KEY=你的key
   ```
3. 保存，重启 `pnpm dev`。以后**不用再改**，除非你换 key。

---

**变量名不会改。** 以后也一直是 `OPENROUTER_API_KEY` 和 `SCRAPINGBEE_API_KEY`，不会换来换去。

可选（不填也能生成报告，只是没有亚马逊真实数据和评论）：
- RAPIDAPI_KEY：拉亚马逊产品、评论时再填。
