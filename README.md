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
LLM_MODEL=google/gemini-2.0-flash-001
```

说明：
- `production` 下如果未配置 `API_ACCESS_TOKEN`，API 会拒绝请求（500）以避免裸奔。
- `development` 下未配置 `API_ACCESS_TOKEN` 时允许本地调试。
