/**
 * 分块测试 A：只测「用 RapidAPI 拉 1 个 ASIN 的产品信息」
 * 用法：node scripts/test-rapidapi-product.mjs "ASIN列表 站点"
 * 支持中英文逗号、空格、换行、斜杠等，系统会过滤出合法 ASIN，与正式提交时逻辑一致。
 * 例：  node scripts/test-rapidapi-product.mjs "B0BR7PY4GC, B0B7J4QQ39 US"
 * 例：  node scripts/test-rapidapi-product.mjs "B0BR7PY4GC B0B7J4QQ39，B0B7J3L9HR US"
 */

import fs from "node:fs"
import path from "node:path"

// 读取 .env.local 里的配置
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
const RAPIDAPI_AMAZON_PATH = process.env.RAPIDAPI_AMAZON_PATH || "product-details"

// 合法 ASIN：正好 10 位字母或数字
const ASIN_REGEX = /^[A-Z0-9]{10}$/
// 合法站点（2 位）
const COUNTRIES = new Set(["US", "UK", "CA", "DE", "FR", "IT", "ES", "JP", "IN", "AU", "MX", "BR", "NL", "SE", "PL", "TR", "SG", "SA", "AE"])

/**
 * 从「任意用户输入」里解析出 ASIN 列表 + 站点（与系统 generate 逻辑一致）
 * 支持：空格、换行、英文逗号、中文逗号、分号、斜杠等
 */
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

// 把命令行参数拼成一行再解析（支持你整段粘贴）
const raw = process.argv.slice(2).join(" ")
const { asins, country } = parseInput(raw)

if (asins.length === 0) {
  console.log("用法：node scripts/test-rapidapi-product.mjs \"ASIN 或 ASIN列表 站点\"")
  console.log("支持中英文逗号、空格、换行、斜杠；系统会过滤出合法 10 位 ASIN。")
  console.log("例：node scripts/test-rapidapi-product.mjs \"B0BR7PY4GC, B0B7J4QQ39 US\"")
  process.exit(1)
}

// 本次只测第 1 个 ASIN，省 API 配额
const asin = asins[0]
if (asins.length > 1) {
  console.log("已从输入中解析出", asins.length, "个 ASIN：", asins.join(", "))
  console.log("站点：", country)
  console.log("本次只测第 1 个 ASIN 以节省配额：", asin)
  console.log("")
}

if (!RAPIDAPI_KEY) {
  console.error("请在 .env.local 里配置 RAPIDAPI_KEY")
  process.exit(1)
}

const url = `https://${RAPIDAPI_AMAZON_HOST}/${RAPIDAPI_AMAZON_PATH}?asin=${encodeURIComponent(asin)}&country=${country}`

console.log("正在请求：", url)
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
  const text = await res.text()
  console.error("返回内容：", text.slice(0, 500))
  process.exit(1)
}

const data = await res.json()
console.log("✅ 成功拿到产品数据")
console.log("")
console.log("返回字段预览：", Object.keys(data).join(", "))
console.log("")
console.log("完整返回（前 1500 字）：")
console.log(JSON.stringify(data, null, 2).slice(0, 1500))
