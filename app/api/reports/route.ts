import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, getReportMetaFilePath, parseReportIdFromFilename } from "@/lib/server/report-storage"
import { ReportMetadata } from "@/lib/report-metadata"

// 扫描 content/reports/ 目录，提取报告元数据
export async function GET(request: NextRequest) {
    return withApiAudit(request, "reports:list", async ({ requestId }) => {
        const guardError = enforceApiGuard(request, { route: "reports:list", maxRequests: 120, windowMs: 60_000, requestId })
        if (guardError) return guardError

        try {
            const reportsDir = path.join(process.cwd(), "content", "reports")

            if (!fs.existsSync(reportsDir)) {
                return NextResponse.json({ reports: [] })
            }

            const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".md"))

            const reports = files.flatMap((file) => {
                try {
                    const id = parseReportIdFromFilename(file)
                    if (!id) return []

                    const metaPath = getReportMetaFilePath(id)
                    const mdPath = getReportFilePath(id)
                    if (!fs.existsSync(mdPath)) return []
                    const stat = fs.statSync(mdPath)

                    let meta: ReportMetadata | null = null

                    if (fs.existsSync(metaPath)) {
                        try {
                            meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"))
                        } catch (e) {
                            console.error(`Failed to parse meta for ${id}:`, e)
                        }
                    }

                    if (!meta) {
                        let fd: number | null = null
                        try {
                            fd = fs.openSync(mdPath, "r")
                            const buffer = Buffer.alloc(512)
                            fs.readSync(fd, buffer, 0, 512, 0)
                        } finally {
                            if (fd !== null) fs.closeSync(fd)
                        }
                        const preview = buffer.toString("utf-8")
                        const titleMatch = preview.match(/^#\s+(.+)$/m)
                        const title = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : id
                        const birth = stat.birthtime ?? stat.mtime
                        const mtime = stat.mtime ?? stat.birthtime
                        return {
                            id,
                            title,
                            source: "uploaded" as const,
                            status: "completed" as const,
                            progress: 100,
                            createdAt: birth.toISOString(),
                            updatedAt: mtime.toISOString(),
                            chapters: [],
                            summary: "暂无摘要",
                            fileSize: stat.size ?? 0,
                            archivedStatus: "active" as const,
                        }
                    }

                    const source = (meta.source === "uploaded" || meta.source === "featured") ? "uploaded" : "system"
                    return {
                        id,
                        title: meta.title ?? id,
                        source,
                        status: "completed" as const,
                        progress: 100,
                        createdAt: meta.createdAt ?? stat.mtime.toISOString(),
                        updatedAt: meta.updatedAt ?? stat.mtime.toISOString(),
                        chapters: [],
                        summary: `${meta.marketplace ?? ""} | ${meta.language ?? ""} | ${meta.model ?? ""}`.trim() || "暂无摘要",
                        fileSize: stat.size || 0,
                        archivedStatus: (meta.status === "archived" ? "archived" : "active") as const,
                        archivedAt: meta.archivedAt,
                    }
                } catch (e) {
                    console.error(`Error reading report file ${file}:`, e)
                    return []
                }
            })

            reports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

            return NextResponse.json({ reports })
        } catch (error) {
            console.error("Error listing reports:", error)
            return apiError("Failed to list reports", { status: 500, code: "REPORTS_LIST_FAILED", requestId })
        }
    })
}
