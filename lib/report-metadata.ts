export type ReportDataFile = {
  id: string
  category: string
  name: string
  size: string
  icon?: string
  addedAt: string
  source: "系统采集" | "用户上传"
  storagePath?: string
  mimeType?: string
}

// ReportSource 统一从 lib/types.ts 导入
import type { ReportSource } from "@/lib/types"
export type { ReportSource }

export type ReportMetadata = {
  reportId: string
  title: string
  coreAsins: string[]
  competitorAsins: string[]
  marketplace: string
  language: string
  model: string
  websiteCount: number
  youtubeCount: number
  customPrompt?: string
  createdAt: string
  updatedAt: string
  dataFiles: ReportDataFile[]
  status?: "active" | "archived"  // 报告状态：active=活跃，archived=已存档
  archivedAt?: string              // 存档时间
  /** 来源：本系统生成仅出现在「我的报告」，上传的仅出现在「精选报告」 */
  source?: ReportSource
  /** 生成时是否因达到模型输出上限而可能被截断；仅 system 报告有意义 */
  possiblyTruncated?: boolean
}

/** 单条抓取来源（持久化供数据源展示与智能问答检索） */
export type ReportSourceItem = {
  source_type: "product_info" | "reviews" | "reference_site" | "reference_youtube" | "return_report" | "persona"
  source_key: string
  display_label: string
  content: string
  char_count: number
  meta?: Record<string, unknown>
}

export function toLanguageLabel(languageCode: string): string {
  const map: Record<string, string> = {
    zh: "中文",
    en: "English",
    ja: "日本語",
    de: "Deutsch",
    fr: "Français",
    it: "Italiano",
    es: "Español",
    nl: "Nederlands",
    sv: "Svenska",
    pl: "Polski",
    pt: "Português",
    ar: "العربية",
    tr: "Türkçe",
    ko: "한국어",
  }
  return map[languageCode] ?? languageCode
}
