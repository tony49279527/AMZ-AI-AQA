/**
 * 分块测试 C：只测「用 ScrapingBee 抓 1 个网页」
 * 用法：node scripts/test-scrapingbee.mjs "网页地址"
 * 例：  node scripts/test-scrapingbee.mjs "https://www.reddit.com/r/woodworking/comments/xxx"
 */

import fs from "node:fs"
import path from "node:path"

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    console.error("未找到 .env.local，请先配置 SCRAPINGBEE_API_KEY")
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

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const url = process.argv[2]?.trim()

if (!url || !url.startsWith("http")) {
  console.log("用法：node scripts/test-scrapingbee.mjs \"网页地址\"")
  console.log("例：  node scripts/test-scrapingbee.mjs \"https://www.example.com/page\"")
  process.exit(1)
}

if (!SCRAPINGBEE_API_KEY) {
  console.error("请在 .env.local 里配置 SCRAPINGBEE_API_KEY")
  process.exit(1)
}

const apiUrl = `https://app.scrapingbee.com/api/v1?api_key=${encodeURIComponent(SCRAPINGBEE_API_KEY)}&url=${encodeURIComponent(url)}`

console.log("正在抓取：", url)
console.log("")

const res = await fetch(apiUrl, { method: "GET" })

if (!res.ok) {
  console.error("请求失败，状态码：", res.status)
  process.exit(1)
}

const html = await res.text()
const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

if (!text) {
  console.log("⚠️ 拿到页面但提取不出正文（可能需登录或反爬）")
  process.exit(0)
}

console.log("✅ 成功抓到网页")
console.log("正文约", text.length, "字")
console.log("")
console.log("前 500 字预览：")
console.log(text.slice(0, 500) + (text.length > 500 ? "..." : ""))
