/**
 * 报告生成与前端共用的常量（市场、LLM 模型、章节标签等）
 */

export const ALLOWED_MARKETPLACES = [
  "US", "CA", "MX", "BR",
  "UK", "DE", "FR", "IT", "ES", "NL", "SE", "PL", "TR",
  "JP", "AU", "SG", "IN", "SA", "AE",
] as const

export const DEFAULT_LLM_MODEL = "anthropic/claude-sonnet-4.5"

export const LLM_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "anthropic/claude-sonnet-4.5", label: "anthropic/claude-sonnet-4.5" },
  { value: "google/gemini-3-pro-preview", label: "google/gemini-3-pro-preview" },
  { value: "openai/gpt-5.2-pro", label: "openai/gpt-5.2-pro" },
  { value: "openai/gpt-5.2-chat", label: "openai/gpt-5.2-chat" },
  { value: "qwen/qwen3-v1-235b-a22b-thinking", label: "qwen/qwen3-v1-235b-a22b-thinking" },
  { value: "deepseek/deepseek-v3.2-speciale", label: "deepseek/deepseek-v3.2-speciale" },
]

/**
 * 各模型报告生成时建议的 max_tokens（输出上限），避免超出模型能力导致报错，同时尽量保证长报告完整。
 * 未列出的模型使用 REPORT_DEFAULT_MAX_TOKENS。
 */
export const REPORT_MAX_TOKENS_BY_MODEL: Record<string, number> = {
  "anthropic/claude-sonnet-4.5": 16384,
  "google/gemini-3-pro-preview": 32768,
  "openai/gpt-5.2-pro": 32768,
  "openai/gpt-5.2-chat": 32768,
  "qwen/qwen3-v1-235b-a22b-thinking": 32768,
  "deepseek/deepseek-v3.2-speciale": 32768,
}

export const REPORT_DEFAULT_MAX_TOKENS = 16384

export function getReportMaxTokens(modelId: string): number {
  if (!modelId || typeof modelId !== "string") return REPORT_DEFAULT_MAX_TOKENS
  const normalized = modelId.trim()
  return REPORT_MAX_TOKENS_BY_MODEL[normalized] ?? REPORT_DEFAULT_MAX_TOKENS
}

/** 报告章节 id 与展示标签（与 API 生成章节一致） */
export const REPORT_CHAPTER_LABELS: Record<string, string> = {
  market: "一、市场与客群洞察",
  competitor: "二、竞品分析与我方策略",
  returns: "三、退货报告分析",
  listing: "四、Listing全面优化方案",
  product: "五、产品及周边优化建议",
  keywords: "六、关联场景词/产品拓展",
  summary: "报告总结",
}

export const REPORT_CHAPTER_IDS = Object.keys(REPORT_CHAPTER_LABELS) as string[]
