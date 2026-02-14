import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportUploadsDir, isValidReportId, reportExists } from "@/lib/server/report-storage"

const MIME_BY_EXT: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

function resolveParams(context: { params: Promise<unknown> }): Promise<{ reportId: string; fileName: string }> {
  return context.params.then((raw) => {
    const params = raw as { reportId?: unknown; fileName?: unknown }
    return {
      reportId: typeof params.reportId === "string" ? params.reportId : "",
      fileName: typeof params.fileName === "string" ? params.fileName : "",
    }
  })
}

function isSafeStoragePath(storagePath: string): boolean {
  if (!storagePath) return false
  if (path.isAbsolute(storagePath)) return false
  if (storagePath.includes("..")) return false
  return storagePath === path.basename(storagePath)
}

function inferMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  return MIME_BY_EXT[ext] || "application/octet-stream"
}

function toSafeDownloadName(fileName: string): string {
  return path.basename(fileName).replace(/["\\\r\n]/g, "_")
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:files:get", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "report:files:get", maxRequests: 120, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const { reportId, fileName } = await resolveParams(context)
    if (!isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }
    if (!reportExists(reportId)) {
      return apiError("Report not found", { status: 404, code: "REPORT_NOT_FOUND", requestId })
    }

    if (!isSafeStoragePath(fileName)) {
      return apiError("Invalid file path", { status: 400, code: "INVALID_FILE_PATH", requestId })
    }

    const uploadsDir = getReportUploadsDir(reportId)
    const fullPath = path.join(uploadsDir, fileName)

    if (!fs.existsSync(fullPath)) {
      return apiError("File not found", { status: 404, code: "FILE_NOT_FOUND", requestId })
    }

    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) {
      return apiError("Invalid file", { status: 404, code: "INVALID_FILE", requestId })
    }

    const buffer = fs.readFileSync(fullPath)
    const encodedName = encodeURIComponent(toSafeDownloadName(fileName))
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": inferMimeType(fileName),
        "Content-Length": String(stat.size),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      },
    })
  })
}
