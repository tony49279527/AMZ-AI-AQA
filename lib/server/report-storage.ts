import { randomBytes } from "crypto"
import fs from "fs"
import path from "path"

export const REPORT_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/
const REPORT_FILE_REGEX = /^report_([a-zA-Z0-9_-]{1,64})\.md$/

export function getReportsDir(): string {
  return path.join(process.cwd(), "content", "reports")
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

export function getReportFilePath(reportId: string): string {
  return path.join(getReportsDir(), `report_${reportId}.md`)
}

export function reportExists(reportId: string): boolean {
  return fs.existsSync(getReportFilePath(reportId))
}

export function getReportMetaFilePath(reportId: string): string {
  return path.join(getReportsDir(), `report_${reportId}.meta.json`)
}

export function getReportUploadsDir(reportId: string): string {
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
