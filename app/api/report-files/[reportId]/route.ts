import { randomUUID } from "crypto"
import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { ReportDataFile } from "@/lib/report-metadata"
import { ensureReportUploadsDir, getReportUploadsDir, isValidReportId, reportExists } from "@/lib/server/report-storage"

const MAX_FILES_PER_REQUEST = 10
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024
const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024

const ALLOWED_EXTENSIONS = new Set([
  ".csv",
  ".xlsx",
  ".xls",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".json",
])

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/json",
  "text/json",
])

function resolveReportId(context: { params: Promise<unknown> }): Promise<string> {
  return context.params.then((raw) => {
    const params = raw as { reportId?: unknown }
    return typeof params.reportId === "string" ? params.reportId : ""
  })
}

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName)
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function inferFileCategory(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "上传文件"
  if (lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "上传文件"
  return "上传文件"
}

function inferFileIcon(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".csv")) return "fa-file-csv text-slate-400"
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "fa-file-excel text-slate-400"
  if (lower.endsWith(".pdf")) return "fa-file-pdf text-slate-400"
  return "fa-file text-slate-400"
}

function formatFileSize(fileSize: number): string {
  if (fileSize > 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`
  }
  return `${(fileSize / 1024).toFixed(0)}KB`
}

function isAllowedFile(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) return false
  if (!file.type) return true
  const baseMime = file.type.split(";")[0].toLowerCase()
  return ALLOWED_MIME_TYPES.has(baseMime)
}

function isSafeStoragePath(storagePath: string): boolean {
  if (!storagePath) return false
  if (path.isAbsolute(storagePath)) return false
  if (storagePath.includes("..")) return false
  return storagePath === path.basename(storagePath)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:files:upload", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "report:files:upload", maxRequests: 20, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const reportId = await resolveReportId(context)
    if (!isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }
    if (!reportExists(reportId)) {
      return apiError("Report not found", { status: 404, code: "REPORT_NOT_FOUND", requestId })
    }

    try {
      const formData = await request.formData()
      const entries = formData.getAll("files")
      const files = entries.filter((entry): entry is File => entry instanceof File)

      if (files.length === 0) {
        return apiError("No files uploaded", { status: 400, code: "NO_FILES_UPLOADED", requestId })
      }
      if (files.length > MAX_FILES_PER_REQUEST) {
        return apiError(`Too many files. Max ${MAX_FILES_PER_REQUEST} files per request.`, {
          status: 400,
          code: "TOO_MANY_FILES",
          requestId,
        })
      }

      let totalSize = 0
      for (const file of files) {
        if (file.size <= 0) {
          return apiError(`Empty file is not allowed: ${file.name}`, { status: 400, code: "EMPTY_FILE", requestId })
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return apiError(`File too large: ${file.name}. Max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`, {
            status: 400,
            code: "FILE_TOO_LARGE",
            requestId,
          })
        }
        if (!isAllowedFile(file)) {
          return apiError(`Unsupported file type: ${file.name}`, { status: 400, code: "UNSUPPORTED_FILE_TYPE", requestId })
        }
        totalSize += file.size
        if (totalSize > MAX_TOTAL_SIZE_BYTES) {
          return apiError(`Total upload size exceeds ${(MAX_TOTAL_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`, {
            status: 400,
            code: "TOTAL_UPLOAD_TOO_LARGE",
            requestId,
          })
        }
      }

      const uploadsDir = ensureReportUploadsDir(reportId)
      const nowDate = new Date().toISOString().split("T")[0]

      const uploadedFiles: ReportDataFile[] = []
      for (const file of files) {
        const safeName = sanitizeFileName(file.name)
        const storageName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`
        const filePath = path.join(uploadsDir, storageName)

        const buffer = Buffer.from(await file.arrayBuffer())
        fs.writeFileSync(filePath, buffer)

        uploadedFiles.push({
          id: `uploaded-${randomUUID().slice(0, 12)}`,
          category: inferFileCategory(file.name),
          name: file.name,
          size: formatFileSize(file.size),
          icon: inferFileIcon(file.name),
          addedAt: nowDate,
          source: "用户上传",
          storagePath: storageName,
          mimeType: file.type || "application/octet-stream",
        })
      }

      return NextResponse.json({ files: uploadedFiles })
    } catch (error) {
      console.error("Failed to upload files:", error)
      return apiError("Failed to upload files", { status: 500, code: "FILE_UPLOAD_FAILED", requestId })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<unknown> }
) {
  return withApiAudit(request, "report:files:delete", async ({ requestId }) => {
    const guardError = enforceApiGuard(request, { route: "report:files:delete", maxRequests: 40, windowMs: 60_000, requestId })
    if (guardError) return guardError

    const reportId = await resolveReportId(context)
    if (!isValidReportId(reportId)) {
      return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
    }
    if (!reportExists(reportId)) {
      return apiError("Report not found", { status: 404, code: "REPORT_NOT_FOUND", requestId })
    }

    try {
      const body = (await request.json()) as { storagePath?: unknown }
      const storagePath = typeof body.storagePath === "string" ? body.storagePath : ""

      if (!isSafeStoragePath(storagePath)) {
        return apiError("Invalid storage path", { status: 400, code: "INVALID_STORAGE_PATH", requestId })
      }

      const uploadsDir = getReportUploadsDir(reportId)
      if (!fs.existsSync(uploadsDir)) {
        return NextResponse.json({ success: true })
      }
      const fullPath = path.join(uploadsDir, storagePath)

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("Failed to delete file:", error)
      return apiError("Failed to delete file", { status: 500, code: "FILE_DELETE_FAILED", requestId })
    }
  })
}
