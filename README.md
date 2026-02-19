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
# ScrapingBee：一个 key 全搞定（Google 搜索找参考站 + 网页抓取 + YouTube 搜索 & 字幕）
SCRAPINGBEE_API_KEY=your-scrapingbee-api-key
# Serper：可选，与 ScrapingBee 二选一即可（用于找参考网站链接）
# SERPER_API_KEY=your-serper-key
```

说明：
- `production` 下如果未配置 `API_ACCESS_TOKEN`，API 会拒绝请求（500）以避免裸奔。
- `development` 下未配置 `API_ACCESS_TOKEN` 时允许本地调试。
- **认证**：当前登录为前端模拟（密码以 SHA-256 哈希存于 localStorage），仅适合演示/内网。生产环境请接入后端认证（如 NextAuth + 数据库）。

## 数据存在哪里（重要：避免「报告/问答不见了」）

- **报告（我的报告 / 精选）**：存在**你电脑上的文件夹**里：
  - 路径：项目下的 `content/reports/`（里面是 `report_xxx.md` 和 `report_xxx.meta.json`）。
  - 请**务必每次在同一层目录启动**：在终端先执行 `cd report-generation-system`，再执行 `pnpm dev`。否则可能读到别的空目录，列表会空。
  - 已做兼容：若从上级目录启动，会自动用 `report-generation-system/content/reports/`，报告不会丢。
- **智能问答记录**：存在**浏览器本地**（localStorage），**没有**存在服务器或 `content/reports`。
  - 清空浏览器缓存/网站数据、换浏览器、换电脑、无痕模式，记录都会没。
  - 若需要长期保留，后续可考虑改为存服务器（需开发）。

**建议**：定期把整个项目文件夹（尤其 `content/reports`）复制一份到 U 盘或网盘做备份，避免误删或换电脑后报告丢失。

## 架构假设与限制

- **单实例**：限流使用进程内内存，多实例部署时每实例独立计数；报告与 meta 存于 `content/reports/` 文件系统，无 DB、无备份。扩展时需引入 Redis 限流与数据库/对象存储。
- **报告生成**：生成开始后当前无法由客户端取消；刷新或关闭页签后服务端仍会继续请求 LLM 并写文件。