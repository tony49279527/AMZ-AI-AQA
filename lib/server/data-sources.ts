/**
 * 外部数据源：RapidAPI（亚马逊）、ScrapingBee（网页）、Serper（搜索）、YouTube（搜索+字幕）
 * 根据产品信息提取关键词 → 搜索参考网站与 YouTube 视频 → 抓取内容/字幕供报告生成。
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_AMAZON_HOST = process.env.RAPIDAPI_AMAZON_HOST || "real-time-amazon-data.p.rapidapi.com"
const RAPIDAPI_AMAZON_PATH = process.env.RAPIDAPI_AMAZON_PATH || "product-details"
const RAPIDAPI_REVIEWS_PATH = "product-reviews"
const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const SERPER_API_KEY = process.env.SERPER_API_KEY
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.YOUTUBE_API_KEY

/** 单条评论在 API 返回中的可能字段（不同 API 版本可能不同） */
function reviewToText(review: unknown): string {
  if (review == null) return ""
  const r = review as Record<string, unknown>
  const title = typeof r.title === "string" ? r.title : ""
  const comment = typeof r.comment === "string" ? r.comment : typeof r.review_text === "string" ? r.review_text : typeof r.body === "string" ? r.body : ""
  const rating = r.star_rating ?? r.rating
  const ratingStr = rating != null ? ` [${rating}星]` : ""
  if (title || comment) return `${title}${ratingStr}\n${comment}`.trim()
  if (typeof r === "string") return r
  return JSON.stringify(r)
}

/** 国家/市场代码映射（部分 RapidAPI 用 country 参数） */
const MARKETPLACE_TO_COUNTRY: Record<string, string> = {
  US: "US", UK: "UK", CA: "CA", DE: "DE", FR: "FR", IT: "IT", ES: "ES", JP: "JP", IN: "IN", AU: "AU",
}

/**
 * 通过 RapidAPI 拉取亚马逊产品数据（按 ASIN）。
 * 需配置 RAPIDAPI_KEY；RAPIDAPI_AMAZON_HOST 不配则用 real-time-amazon-data.p.rapidapi.com。
 * 若你用的是 RapidAPI 上别的亚马逊 API，可改 HOST 或本函数内的 URL/参数。
 */
export async function fetchAmazonDataFromRapidAPI(
  asinList: string[],
  marketplace: string,
  options?: { maxProducts?: number }
): Promise<string> {
  if (!RAPIDAPI_KEY || asinList.length === 0) return ""
  const max = Math.min(options?.maxProducts ?? 5, asinList.length)
  const country = MARKETPLACE_TO_COUNTRY[marketplace] || marketplace
  const results: string[] = []

  for (let i = 0; i < max; i++) {
    const asin = asinList[i].trim()
    if (!asin) continue
    try {
      const path = RAPIDAPI_AMAZON_PATH.replace(/^\//, "")
      const url = `https://${RAPIDAPI_AMAZON_HOST}/${path}?asin=${encodeURIComponent(asin)}&country=${country}`
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_AMAZON_HOST,
        },
      })
      if (!res.ok) continue
      const data = (await res.json()) as Record<string, unknown>
      results.push(`[ASIN: ${asin}]\n${JSON.stringify(data, null, 0)}`)
    } catch {
      // 单条失败不阻塞，继续下一个
    }
  }

  if (results.length === 0) return ""
  return "以下为通过 RapidAPI 获取的亚马逊产品数据（JSON），请据此做分析：\n\n" + results.join("\n\n---\n\n")
}

/**
 * 通过 RapidAPI 拉取指定 ASIN 的评论（分页）。
 * 接口：GET https://real-time-amazon-data.p.rapidapi.com/product-reviews?asin=xxx&page=1&country=US
 * 每 ASIN 最多拉取 maxReviews 条（通过多次 page 请求凑齐）。
 */
export async function fetchProductReviewsFromRapidAPI(
  asin: string,
  country: string,
  options?: { maxReviews?: number; maxPages?: number }
): Promise<string[]> {
  if (!RAPIDAPI_KEY || !asin.trim()) return []
  const maxReviews = Math.min(options?.maxReviews ?? 100, 200)
  const maxPages = options?.maxPages ?? 10
  const path = RAPIDAPI_REVIEWS_PATH.replace(/^\//, "")
  const all: string[] = []

  for (let page = 1; page <= maxPages && all.length < maxReviews; page++) {
    try {
      const url = `https://${RAPIDAPI_AMAZON_HOST}/${path}?asin=${encodeURIComponent(asin.trim())}&page=${page}&country=${encodeURIComponent(country)}`
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_AMAZON_HOST,
        },
      })
      if (!res.ok) break
      const data = (await res.json()) as Record<string, unknown>
      const list: unknown[] =
        Array.isArray(data.reviews)
          ? data.reviews
          : Array.isArray((data.data as Record<string, unknown>)?.reviews)
            ? (data.data as Record<string, unknown>).reviews as unknown[]
            : Array.isArray(data.data)
              ? (data.data as unknown[])
              : []
      if (list.length === 0) break
      for (const item of list) {
        const text = reviewToText(item)
        if (text) all.push(`[ASIN: ${asin}]\n${text}`)
        if (all.length >= maxReviews) break
      }
    } catch {
      break
    }
  }

  return all
}

/**
 * 拉取多个 ASIN 的评论并合并为一段混合文本（主品+竞品），每 ASIN 最多 maxPerAsin 条。
 */
export async function fetchCombinedReviewsFromRapidAPI(
  asinList: string[],
  marketplace: string,
  options?: { maxPerAsin?: number }
): Promise<string> {
  if (!RAPIDAPI_KEY || asinList.length === 0) return ""
  const country = MARKETPLACE_TO_COUNTRY[marketplace] || marketplace
  const maxPerAsin = options?.maxPerAsin ?? 100
  const chunks: string[] = []

  for (const asin of asinList) {
    const asinTrim = asin.trim()
    if (!asinTrim) continue
    const reviews = await fetchProductReviewsFromRapidAPI(asinTrim, country, { maxReviews: maxPerAsin })
    if (reviews.length > 0) chunks.push(reviews.join("\n\n"))
  }

  if (chunks.length === 0) return ""
  return "以下为通过 RapidAPI 获取的亚马逊产品评论（按 ASIN 区分），请据此分析主品与各竞品的用户反馈：\n\n" + chunks.join("\n\n---\n\n")
}

/**
 * 通过 ScrapingBee 抓取指定 URL 的网页内容。
 * 需配置 SCRAPINGBEE_API_KEY。返回纯文本摘要（截断），便于放入提示词。
 */
export async function fetchWebWithScrapingBee(
  url: string,
  options?: { maxLength?: number }
): Promise<string> {
  if (!SCRAPINGBEE_API_KEY) return ""
  const maxLen = options?.maxLength ?? 8000
  try {
    const apiUrl = `https://app.scrapingbee.com/api/v1?api_key=${encodeURIComponent(SCRAPINGBEE_API_KEY)}&url=${encodeURIComponent(url)}`
    const res = await fetch(apiUrl, { method: "GET" })
    if (!res.ok) return ""
    const html = await res.text()
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLen)
    return text ? `[URL: ${url}]\n${text}` : ""
  } catch {
    return ""
  }
}

/**
 * 批量抓取多个 URL（ScrapingBee），合并为一段文本。
 */
export async function fetchMultipleWebWithScrapingBee(
  urls: string[],
  options?: { maxPerUrl?: number; maxUrls?: number }
): Promise<string> {
  if (!SCRAPINGBEE_API_KEY || urls.length === 0) return ""
  const maxUrls = Math.min(options?.maxUrls ?? 5, urls.length)
  const parts: string[] = []
  for (let i = 0; i < maxUrls; i++) {
    const text = await fetchWebWithScrapingBee(urls[i], { maxLength: options?.maxPerUrl ?? 6000 })
    if (text) parts.push(text)
  }
  if (parts.length === 0) return ""
  return "以下为通过 ScrapingBee 抓取的网页内容摘要，请酌情引用：\n\n" + parts.join("\n\n---\n\n")
}

// ─── 根据产品信息提取搜索关键词（用于参考网站 + YouTube） ───
/** 从 RapidAPI 产品数据文本中提取第一个产品的标题/名称，用作搜索关键词 */
export function extractProductSearchQuery(productsInfoText: string): string {
  if (!productsInfoText || typeof productsInfoText !== "string") return ""
  const trimmed = productsInfoText.trim()
  // 尝试匹配 JSON 中的 title / product_title / name（常见 RapidAPI 产品字段）
  const titleMatch = trimmed.match(/"title"\s*:\s*"([^"]+)"/) ?? trimmed.match(/"product_title"\s*:\s*"([^"]+)"/) ?? trimmed.match(/"name"\s*:\s*"([^"]{5,120})"/)
  const candidate = titleMatch?.[1]?.trim()
  if (candidate) return candidate.replace(/\\u[\da-fA-F]{4}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16))).slice(0, 80)
  // 回退：取第一行非 [ASIN 的短句
  const firstLine = trimmed.split(/\n/).find((l) => l.trim() && !l.trim().startsWith("[ASIN"))
  if (firstLine) {
    const inQuotes = firstLine.match(/"([^"]{10,80})"/)?.[1]
    if (inQuotes) return inQuotes.slice(0, 80)
  }
  return ""
}

/** Serper 搜索（Google），返回有机结果链接。需配置 SERPER_API_KEY */
export async function searchWebUrlsWithSerper(query: string, num: number = 10): Promise<string[]> {
  if (!SERPER_API_KEY || !query.trim()) return []
  try {
    const res = await fetch("https://serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query.trim().slice(0, 200), num: Math.min(20, Math.max(1, num)) }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { organic?: Array<{ link?: string }> }
    const links = (data.organic ?? []).map((o) => o.link).filter((u): u is string => typeof u === "string" && u.startsWith("http"))
    return links
  } catch {
    return []
  }
}

export type YouTubeSearchItem = { videoId: string; title: string; url: string }

/** YouTube Data API v3 按关键词搜索视频。需配置 GOOGLE_API_KEY 或 YOUTUBE_API_KEY */
export async function searchYouTubeVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchItem[]> {
  if (!GOOGLE_API_KEY || !query.trim()) return []
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query.trim().slice(0, 100))}&maxResults=${Math.min(20, Math.max(1, maxResults))}&key=${GOOGLE_API_KEY}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }> }
    const items: YouTubeSearchItem[] = []
    for (const item of data.items ?? []) {
      const videoId = item.id?.videoId
      const title = item.snippet?.title ?? ""
      if (videoId) items.push({ videoId, title, url: `https://www.youtube.com/watch?v=${videoId}` })
    }
    return items
  } catch {
    return []
  }
}

/** 抓取单个 YouTube 视频字幕并合并为纯文本（使用 youtube-transcript） */
export async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  try {
    const { YoutubeTranscript } = await import("youtube-transcript")
    const list = await YoutubeTranscript.fetchTranscript(videoId)
    if (!Array.isArray(list)) return ""
    const text = list.map((t) => (typeof t === "object" && t != null && "text" in t ? String((t as { text: string }).text) : "")).filter(Boolean).join(" ")
    return text.trim().slice(0, 15000) || ""
  } catch {
    return ""
  }
}

/** 根据产品关键词搜索参考网站并抓取内容；若无 Serper 则返回空 */
export async function fetchReferenceWebContentByKeyword(
  productsInfoText: string,
  websiteCount: number,
  options?: { maxPerUrl?: number; maxUrls?: number }
): Promise<string> {
  const result = await fetchReferenceWebContentByKeywordExtended(productsInfoText, websiteCount, options)
  return result.combined
}

export type WebSourceItem = { url: string; display_label: string; content: string; char_count: number }

/** 同上，但返回每条来源（URL、展示名、正文、字数）供持久化与数据源展示 */
export async function fetchReferenceWebContentByKeywordExtended(
  productsInfoText: string,
  websiteCount: number,
  options?: { maxPerUrl?: number; maxUrls?: number }
): Promise<{ combined: string; items: WebSourceItem[] }> {
  const query = extractProductSearchQuery(productsInfoText)
  if (!query) return { combined: "", items: [] }
  const urls = await searchWebUrlsWithSerper(query, options?.maxUrls ?? websiteCount)
  if (urls.length === 0) return { combined: "", items: [] }
  const maxUrls = Math.min(options?.maxUrls ?? Math.min(15, websiteCount), urls.length)
  const maxPerUrl = options?.maxPerUrl ?? 5000
  const items: WebSourceItem[] = []
  const parts: string[] = []
  for (let i = 0; i < maxUrls; i++) {
    const url = urls[i]
    const raw = await fetchWebWithScrapingBee(url, { maxLength: maxPerUrl })
    if (!raw) continue
    const content = raw.replace(/^\[URL:\s*[^\]]+\]\s*/i, "").trim()
    const displayLabel = (() => {
      try {
        const u = new URL(url)
        return u.hostname.replace(/^www\./, "")
      } catch {
        return url.slice(0, 40)
      }
    })()
    items.push({ url, display_label: displayLabel, content, char_count: content.length })
    parts.push(raw)
  }
  const combined = parts.length === 0 ? "" : "以下为通过 ScrapingBee 抓取的网页内容摘要，请酌情引用：\n\n" + parts.join("\n\n---\n\n")
  return { combined, items }
}

/** 根据产品关键词搜索 YouTube 并抓取字幕合并为一段文本 */
export async function fetchReferenceYouTubeTranscriptByKeyword(
  productsInfoText: string,
  youtubeCount: number
): Promise<string> {
  const result = await fetchReferenceYouTubeTranscriptByKeywordExtended(productsInfoText, youtubeCount)
  return result.combined
}

export type YouTubeSourceItem = { url: string; title: string; content: string; char_count: number }

/** 同上，但返回每条来源（URL、标题、字幕、字数）供持久化与数据源展示 */
export async function fetchReferenceYouTubeTranscriptByKeywordExtended(
  productsInfoText: string,
  youtubeCount: number
): Promise<{ combined: string; items: YouTubeSourceItem[] }> {
  const query = extractProductSearchQuery(productsInfoText)
  if (!query || !GOOGLE_API_KEY) return { combined: "", items: [] }
  const videos = await searchYouTubeVideos(`${query} review comparison`, Math.min(15, youtubeCount))
  if (videos.length === 0) return { combined: "", items: [] }
  const items: YouTubeSourceItem[] = []
  const parts: string[] = []
  const maxV = Math.min(videos.length, 10)
  for (let i = 0; i < maxV; i++) {
    const v = videos[i]
    const text = await fetchYouTubeTranscript(v.videoId)
    if (!text) continue
    items.push({ url: v.url, title: v.title, content: text, char_count: text.length })
    parts.push(`[YouTube: ${v.title}]\n${v.url}\n\n${text}`)
  }
  const combined = parts.length === 0 ? "" : "以下为根据产品关键词搜索并抓取的 YouTube 视频字幕，请酌情引用：\n\n" + parts.join("\n\n---\n\n")
  return { combined, items }
}
