/**
 * 分块测试 D：只测「把上传文件解析成纯文本」
 * 用法：node scripts/test-parse-file.mjs "文件路径"
 * 支持 .txt、.csv（Excel 后续再加）。不调用任何 API。
 * 例：  node scripts/test-parse-file.mjs "./sample.txt"
 * 例：  node scripts/test-parse-file.mjs "./退货报告.csv"
 */

import fs from "node:fs"
import path from "node:path"

const filePath = process.argv[2]?.trim()

if (!filePath) {
  console.log("用法：node scripts/test-parse-file.mjs \"文件路径\"")
  console.log("例：  node scripts/test-parse-file.mjs ./sample.txt")
  console.log("例：  node scripts/test-parse-file.mjs ./退货报告.csv")
  process.exit(1)
}

const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

if (!fs.existsSync(fullPath)) {
  console.error("文件不存在：", fullPath)
  process.exit(1)
}

let raw
try {
  raw = fs.readFileSync(fullPath, "utf-8")
} catch (e) {
  console.error("读取失败（可能不是文本或编码不对）：", e.message)
  process.exit(1)
}

// CSV：按行、按逗号拆开，去引号，拼成一段可读文本
// TXT：直接用
const ext = path.extname(fullPath).toLowerCase()
let text
if (ext === ".csv") {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  text = lines
    .map((line) => {
      const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""))
      return cells.join(" ")
    })
    .join("\n")
} else {
  text = raw.trim()
}

if (!text) {
  console.log("⚠️ 文件为空或解析后无内容")
  process.exit(0)
}

console.log("✅ 解析成功")
console.log("类型：", ext === ".csv" ? "CSV" : "TXT/其他")
console.log("约", text.length, "字")
console.log("")
console.log("前 400 字预览：")
console.log(text.slice(0, 400) + (text.length > 400 ? "..." : ""))
