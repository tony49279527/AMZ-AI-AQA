# Report Generation System

## P0 安全基线（已启用）

- API 鉴权：`API_ACCESS_TOKEN`
- 客户端调用头：`x-api-token`（可通过 `NEXT_PUBLIC_API_ACCESS_TOKEN` 注入）
- 限流：已对 `/api/reports`、`/api/report/[reportId]`、`/api/reports/generate`、`/api/chat` 增加内存限流
- 错误响应统一：API 错误统一包含 `error`、`code`、`requestId`
- 审计日志：所有 API 记录 `method/route/status/durationMs/requestId/ip`

## 环境变量

```bash
API_ACCESS_TOKEN=replace-with-strong-token
NEXT_PUBLIC_API_ACCESS_TOKEN=replace-with-same-token
OPENROUTER_API_KEY=replace-with-openrouter-key
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=anthropic/claude-sonnet-4.5
# 可选：OpenRouter 请求来源（报告生成与 Chat 共用），不设则用 NEXT_PUBLIC_APP_URL 或默认
OPENROUTER_HTTP_REFERER=https://your-domain.com
# 可选：前端展示用；错误页「联系支持」链接
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com

# --- 报告使用真实数据时可选 ---
# RapidAPI：亚马逊产品数据（报告生成时会按 ASIN 拉取并注入提示词）
RAPIDAPI_KEY=your-rapidapi-key
RAPIDAPI_AMAZON_HOST=real-time-amazon-data.p.rapidapi.com
RAPIDAPI_AMAZON_PATH=product-details
# ScrapingBee：抓取参考网页正文（由系统根据产品关键词搜索到的链接）
SCRAPINGBEE_API_KEY=your-scrapingbee-api-key
# Serper：根据产品关键词搜索参考网站链接（不填则无参考网站）
SERPER_API_KEY=your-serper-key
# Google/YouTube：根据产品关键词搜索 YouTube 视频并抓取字幕（不填则无 YouTube 参考）
GOOGLE_API_KEY=your-google-api-key
```

说明：
- `production` 下如果未配置 `API_ACCESS_TOKEN`，API 会拒绝请求（500）以避免裸奔。
- `development` 下未配置 `API_ACCESS_TOKEN` 时允许本地调试。
- **认证**：当前登录为前端模拟（密码以 SHA-256 哈希存于 localStorage），仅适合演示/内网。生产环境请接入后端认证（如 NextAuth + 数据库）。

## 架构假设与限制

- **单实例**：限流使用进程内内存，多实例部署时每实例独立计数；报告与 meta 存于 `content/reports/` 文件系统，无 DB、无备份。扩展时需引入 Redis 限流与数据库/对象存储。
- **报告生成**：生成开始后当前无法由客户端取消；刷新或关闭页签后服务端仍会继续请求 LLM 并写文件。
