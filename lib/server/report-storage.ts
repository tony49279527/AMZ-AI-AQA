import { randomBytes } from "crypto"
import fs from "fs"
import path from "path"

export const REPORT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/
const REPORT_FILE_REGEX = /^report_([a-zA-Z0-9_-]{1,64})\.md$/

/** 报告目录：优先用当前目录下的 content/reports；若不存在则尝试 report-generation-system/content/reports（从上级目录启动时） */
export function getReportsDir(): string {
  const cwd = process.cwd()
  const primary = path.join(cwd, "content", "reports")
  if (fs.existsSync(primary)) return primary
  const fallback = path.join(cwd, "report-generation-system", "content", "reports")
  if (fs.existsSync(fallback)) return fallback
  // 从上级目录启动且子目录存在时，新建报告也放到子目录里，避免数据分散
  const subDir = path.join(cwd, "report-generation-system")
  if (fs.existsSync(subDir)) return fallback
  return primary
}

export function ensureReportsDir(): string {
  const reportsDir = getReportsDir()
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }
  return reportsDir
}

export function isValidReportId(reportId: string): boolean {
  return REPORT_ID_REGEX.test(reportId)
}

function assertValidReportId(reportId: string): void {
  if (!isValidReportId(reportId)) throw new Error(`Invalid reportId: ${reportId}`)
}

export function getReportFilePath(reportId: string): string {
  assertValidReportId(reportId)
  return path.join(getReportsDir(), `report_${reportId}.md`)
}

export function reportExists(reportId: string): boolean {
  return fs.existsSync(getReportFilePath(reportId))
}

export function getReportMetaFilePath(reportId: string): string {
  assertValidReportId(reportId)
  return path.join(getReportsDir(), `report_${reportId}.meta.json`)
}

/** 报告抓取来源存储（供数据源 Tab 展示与智能问答检索） */
export function getReportSourcesFilePath(reportId: string): string {
  assertValidReportId(reportId)
  return path.join(getReportsDir(), `report_${reportId}.sources.json`)
}

export function getReportUploadsDir(reportId: string): string {
  assertValidReportId(reportId)
  return path.join(getReportsDir(), "uploads", reportId)
}

export function ensureReportUploadsDir(reportId: string): string {
  const uploadsDir = getReportUploadsDir(reportId)
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

export function parseReportIdFromFilename(fileName: string): string | null {
  const match = fileName.match(REPORT_FILE_REGEX)
  return match ? match[1] : null
}

export function createReportId(): string {
  return `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`
}

export function allocateReportId(reportsDir: string, maxAttempts = 5): { reportId: string; filePath: string } {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reportId = createReportId()
    const filePath = path.join(reportsDir, `report_${reportId}.md`)
    if (!fs.existsSync(filePath)) {
      return { reportId, filePath }
    }
  }

  throw new Error("Failed to allocate unique report ID")
}

export function writeFileAtomically(filePath: string, content: string): void {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(tempPath, content, { encoding: "utf-8", flag: "wx" })
    fs.renameSync(tempPath, filePath)
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }
}
