/**
 * 分块测试 B：只测「用 RapidAPI 拉 1 个 ASIN 的评论」
 * 用法：node scripts/test-rapidapi-reviews.mjs "ASIN或列表 站点"
 * 支持中英文逗号、空格等，只测第 1 个 ASIN、第 1 页，省配额。
 * 例：  node scripts/test-rapidapi-reviews.mjs "B0BR7PY4GC US"
 */

import fs from "node:fs"
import path from "node:path"

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    console.error("未找到 .env.local，请先配置 RAPIDAPI_KEY")
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
      process.env[key] = val
    }
  }
}

loadEnv()

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_AMAZON_HOST = process.env.RAPIDAPI_AMAZON_HOST || "real-time-amazon-data.p.rapidapi.com"
const ASIN_REGEX = /^[A-Z0-9]{10}$/
const COUNTRIES = new Set(["US", "UK", "CA", "DE", "FR", "IT", "ES", "JP", "IN", "AU", "MX", "BR", "NL", "SE", "PL", "TR", "SG", "SA", "AE"])

function parseInput(input) {
  if (!input || typeof input !== "string") return { asins: [], country: "US" }
  const tokens = input
    .split(/[\n,，;\t \/、]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  const asins = []
  let country = "US"
  for (const t of tokens) {
    if (ASIN_REGEX.test(t)) asins.push(t)
    else if (t.length === 2 && (t === "GB" || COUNTRIES.has(t))) country = t === "GB" ? "UK" : t
  }
  return { asins: [...new Set(asins)], country }
}

const raw = process.argv.slice(2).join(" ")
const { asins, country } = parseInput(raw)

if (asins.length === 0) {
  console.log("用法：node scripts/test-rapidapi-reviews.mjs \"ASIN 或 ASIN列表 站点\"")
  console.log("例：  node scripts/test-rapidapi-reviews.mjs \"B0BR7PY4GC US\"")
  process.exit(1)
}

const asin = asins[0]
if (asins.length > 1) {
  console.log("已解析出", asins.length, "个 ASIN，本次只测第 1 个：", asin)
  console.log("站点：", country)
  console.log("")
}

const url = `https://${RAPIDAPI_AMAZON_HOST}/product-reviews?asin=${encodeURIComponent(asin)}&page=1&country=${country}`

console.log("正在请求评论（第 1 页）：", url)
console.log("")

const res = await fetch(url, {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_AMAZON_HOST,
  },
})

if (!res.ok) {
  console.error("请求失败，状态码：", res.status)
  console.error(await res.text().then((t) => t.slice(0, 500)))
  process.exit(1)
}

const data = await res.json()

const list =
  Array.isArray(data.reviews) ? data.reviews
  : Array.isArray(data.data?.reviews) ? data.data.reviews
  : Array.isArray(data.data) ? data.data
  : []

console.log("✅ 成功拿到评论")
console.log("本页条数：", list.length)
console.log("")

if (list.length > 0) {
  console.log("第 1 条评论预览：")
  const first = list[0]
  const title = first.title ?? first.review_title ?? ""
  const body = first.comment ?? first.review_text ?? first.body ?? JSON.stringify(first).slice(0, 200)
  console.log("  标题:", title)
  console.log("  内容:", String(body).slice(0, 300) + (String(body).length > 300 ? "..." : ""))
} else {
  console.log("（本页无评论，可能该 ASIN 暂无评论或接口返回格式不同）")
}
