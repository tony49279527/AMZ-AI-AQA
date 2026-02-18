import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 从输入文本中解析出合法 10 位 ASIN（支持换行、逗号、斜杠、分号、空格等），与后端解析规则一致 */
export function parseAsinListFromText(input: string): string[] {
  if (typeof input !== "string" || !input.trim()) return []
  const tokens = input
    .split(/[\n,，;\t \/]+/)
    .map((item) => item.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter((s) => s.length === 10)
  return Array.from(new Set(tokens))
}
