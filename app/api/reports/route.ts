import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// 扫描 content/reports/ 目录，提取报告元数据
export async function GET() {
    try {
        const reportsDir = path.join(process.cwd(), "content", "reports")

        if (!fs.existsSync(reportsDir)) {
            return NextResponse.json({ reports: [] })
        }

        const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"))

        const reports = files.map((file) => {
            const content = fs.readFileSync(path.join(reportsDir, file), "utf-8")
            const stat = fs.statSync(path.join(reportsDir, file))

            // 提取报告 ID (report_1.md → "1")
            const idMatch = file.match(/report_(\d+)\.md/)
            const id = idMatch ? idMatch[1] : file.replace(".md", "")

            // 提取标题 (第一个 # 标题)
            const titleMatch = content.match(/^#\s+(.+)$/m)
            const rawTitle = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : file

            // 提取章节目录 (## 标题)
            const chapters = content
                .split("\n")
                .filter((line) => line.startsWith("## "))
                .map((line, idx) => ({
                    id: `ch-${idx + 1}`,
                    title: line.replace("## ", "").trim(),
                }))

            // 提取摘要 (第一段非标题非空行)
            const lines = content.split("\n")
            let summary = ""
            for (const line of lines) {
                const trimmed = line.trim()
                if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("*")) {
                    summary = trimmed.slice(0, 120)
                    break
                }
            }

            return {
                id,
                title: rawTitle,
                status: "completed" as const,
                progress: 100,
                createdAt: stat.birthtime.toISOString(),
                updatedAt: stat.mtime.toISOString(),
                chapters,
                summary,
                fileSize: stat.size,
            }
        })

        // 按修改时间倒序
        reports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        return NextResponse.json({ reports })
    } catch (error) {
        console.error("Error listing reports:", error)
        return NextResponse.json({ reports: [] }, { status: 500 })
    }
}
