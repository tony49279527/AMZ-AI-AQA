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
  }
  return map[languageCode] ?? languageCode
}
