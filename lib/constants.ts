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
 * 各模型报告生成时的 max_tokens（输出上限），按当前大模型普遍支持的输出能力设高，减少截断。
 * 未列出的模型使用 REPORT_DEFAULT_MAX_TOKENS。
 */
export const REPORT_MAX_TOKENS_BY_MODEL: Record<string, number> = {
  "anthropic/claude-sonnet-4.5": 131072,
  "google/gemini-3-pro-preview": 131072,
  "google/gemini-2.0-flash-001": 131072,
  "google/gemini-2.0-flash": 131072,
  "openai/gpt-5.2-pro": 131072,
  "openai/gpt-5.2-chat": 131072,
  "qwen/qwen3-v1-235b-a22b-thinking": 131072,
  "deepseek/deepseek-v3.2-speciale": 131072,
}

/** 默认输出上限：128k token，适配当前主流长输出模型 */
export const REPORT_DEFAULT_MAX_TOKENS = 131072

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

/** 图片生成（OpenRouter 图片模型），用于根据报告建议 + 参考图生成主图/A+ 图 */
export const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image-preview"

export const IMAGE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "google/gemini-2.5-flash-image-preview", label: "Gemini 2.5 Flash Image" },
  { value: "google/gemini-3-pro-image-preview", label: "Gemini 3 Pro Image" },
  { value: "black-forest-labs/flux.2-pro", label: "Flux 2 Pro" },
  { value: "black-forest-labs/flux.2-flex", label: "Flux 2 Flex" },
  { value: "openai/gpt-5-image-mini", label: "GPT-5 Image Mini" },
]
