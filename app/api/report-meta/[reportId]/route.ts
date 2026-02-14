import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, getReportMetaFilePath, isValidReportId, writeFileAtomically } from "@/lib/server/report-storage"
import { ReportDataFile, ReportMetadata } from "@/lib/report-metadata"

function resolveReportId(context: { params: Promise<unknown> }): Promise<string> {
  return context.params.then((raw) => {
    const params = raw as { reportId?: unknown }
    return typeof params.reportId === "string" ? params.reportId : ""
  })
}

function readMetadata(metaFilePath: string): ReportMetadata | null {
  if (!fs.existsSync(metaFilePath)) return null
  try {
    const raw = fs.readFileSync(metaFilePath, "utf-8")
    return JSON.parse(raw) as ReportMetadata
  } catch {
    return null
  }
}

function extractTitle(reportMarkdown: string, reportId: string): string {
  const titleMatch = reportMarkdown.match(/^#\s+(.+)$/m)
  if (!titleMatch) return `report_${reportId}`
  return titleMatch[1].replace(/\*+/g, "").trim()
}

function extractAsins(reportMarkdown: string): string[] {
  const candidates = reportMarkdown.match(/\b[A-Z0-9]{10}\b/g) || []
  return Array.from(new Set(candidates))
}

function inferLanguageLabel(reportMarkdown: string): string {
  if (/中文/.test(reportMarkdown)) return "中文"
  if (/English/i.test(reportMarkdown)) return "English"
  return "中文"
}

function inferMarketplace(reportMarkdown: string): string {
  const marketplaceMatch =
    reportMarkdown.match(/(?:市场站点|市场|Marketplace)[:：]\s*([A-Z]{2})/i) ||
    reportMarkdown.match(/\bAmazon\s+([A-Z]{2})\b/i)
  return marketplaceMatch?.[1]?.toUpperCase() || "US"
}

function inferCount(reportMarkdown: string, keyword: RegExp): number {
  const match = reportMarkdown.match(keyword)
  if (!match) return 0
  const value = Number.parseInt(match[1] || "0", 10)
  return Number.isFinite(value) ? value : 0
}

function buildLegacyDataFiles(reportMarkdown: string): ReportDataFile[] {
  const today = new Date().toISOString().split("T")[0]
  const asins = extractAsins(reportMarkdown)
  const [core, ...others] = asins
  const files: ReportDataFile[] = []

  if (core) {
    files.push({
      id: "legacy-core-1",
      category: "亚马逊数据",
      name: `Amazon Product Page (${core})`,
      size: "N/A",
      icon: "fa-shopping-cart text-slate-400",
      addedAt: today,
      source: "系统采集",
    })
  }

  others.slice(0, 5).forEach((asin, index) => {
    files.push({
      id: `legacy-competitor-${index + 1}`,
      category: "竞品数据",
      name: `Competitor Analysis (${asin})`,
      size: "N/A",
      icon: "fa-chart-line text-slate-400",
      addedAt: today,
      source: "系统采集",
    })
  })

  return files
}

function buildMetadataFromLegacyReport(reportId: string): ReportMetadata | null {
  const reportPath = getReportFilePath(reportId)
  if (!fs.existsSync(reportPath)) return null

  const reportMarkdown = fs.readFileSync(reportPath, "utf-8")
  const stat = fs.statSync(reportPath)
  const asins = extractAsins(reportMarkdown)
  const [core, ...others] = asins

  const metadata: ReportMetadata = {
    reportId,
    title: extractTitle(reportMarkdown, reportId),
    coreAsins: core ? [core] : [],
    competitorAsins: others.slice(0, 5),
    marketplace: inferMarketplace(reportMarkdown),
    language: inferLanguageLabel(reportMarkdown),
    model: "unknown",
    websiteCount: inferCount(reportMarkdown, /(\d+)\s*网站/),
    youtubeCount: inferCount(reportMarkdown, /(\d+)\s*(?:视频|YouTube)/i),
    createdAt: stat.birthtime.toISOString().split("T")[0],
    updatedAt: stat.mtime.toISOString(),
    dataFiles: buildLegacyDataFiles(reportMarkdown),
  }

  return metadata
}

function readOrBootstrapMetadata(reportId: string): ReportMetadata | null {
  const metaFilePath = getReportMetaFilePath(reportId)
  const existing = readMetadata(metaFilePath)
  if (existing) return existing

  const bootstrapped = buildMetadataFromLegacyReport(reportId)
  if (!bootstrapped) return null

  writeFileAtomically(metaFilePath, JSON.stringify(bootstrapped, null, 2))
  return bootstrapped
}

function isValidDataFile(value: unknown): value is ReportDataFile {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === "string" &&
    typeof v.category === "string" &&
    typeof v.name === "string" &&
    typeof v.size === "string" &&
    typeof v.addedAt === "string" &&
    (v.storagePath === undefined || typeof v.storagePath === "string") &&
    (v.mimeType === undefined || typeof v.mimeType === "string") &&
    typeof v.source === "string" &&
    (v.source === "系统采集" || v.source === "用户上传")
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:meta:get", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "report:meta", maxRequests: 120, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const reportId = await resolveReportId(context)
    if (!isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }

    const metadata = readOrBootstrapMetadata(reportId)
    if (!metadata) {
      return apiError("Metadata not found", { status: 404, code: "REPORT_METADATA_NOT_FOUND", requestId })
    }

    return NextResponse.json(metadata)
  })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:meta:update", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "report:meta:update", maxRequests: 60, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const reportId = await resolveReportId(context)
    if (!isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }

    const metaFilePath = getReportMetaFilePath(reportId)
    const existing = readOrBootstrapMetadata(reportId)
    if (!existing) {
      return apiError("Metadata not found", { status: 404, code: "REPORT_METADATA_NOT_FOUND", requestId })
    }

    try {
      const body = await request.json()
      const incomingFiles = body?.dataFiles

      if (!Array.isArray(incomingFiles) || !incomingFiles.every(isValidDataFile)) {
        return apiError("Invalid dataFiles payload", { status: 400, code: "INVALID_DATA_FILES", requestId })
      }

      const next: ReportMetadata = {
        ...existing,
        dataFiles: incomingFiles,
        updatedAt: new Date().toISOString(),
      }

      writeFileAtomically(metaFilePath, JSON.stringify(next, null, 2))
      return NextResponse.json(next)
    } catch (error) {
      console.error("Failed to update metadata:", error)
      return apiError("Failed to update metadata", { status: 500, code: "REPORT_METADATA_UPDATE_FAILED", requestId })
    }
  })
}
