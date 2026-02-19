import { NextRequest } from "next/server"
import fs from "fs"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportSourcesFilePath, isValidReportId } from "@/lib/server/report-storage"
import type { ReportSourceItem } from "@/lib/report-metadata"

function resolveReportId(context: { params: Promise<unknown> }): Promise<string> {
  return context.params.then((raw) => {
    const params = raw as { reportId?: unknown }
    return typeof params.reportId === "string" ? params.reportId : ""
  })
}

/** 列表项：不含 content，供数据源 Tab 展示 */
type SourceListItem = Pick<ReportSourceItem, "source_type" | "source_key" | "display_label" | "char_count">

export async function GET(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:sources:list", async ({ requestId }) => {
    const guardError = await enforceApiGuard(request, { route: "report:sources", maxRequests: 120, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const reportId = await resolveReportId(context)
    if (!reportId || !isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }

    const filePath = getReportSourcesFilePath(reportId)
    if (!fs.existsSync(filePath)) {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    try {
      const raw = fs.readFileSync(filePath, "utf-8")
      const items = JSON.parse(raw) as ReportSourceItem[]
      const list: SourceListItem[] = Array.isArray(items)
        ? items.map(({ content: _c, ...rest }) => rest)
        : []
      return new Response(JSON.stringify({ items: list }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch {
      return apiError("Failed to read report sources", { status: 500, code: "SOURCES_READ_FAILED", requestId })
    }
  })
}
