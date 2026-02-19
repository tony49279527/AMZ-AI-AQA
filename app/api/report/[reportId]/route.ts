import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { enforceApiGuard } from "@/lib/server/api-guard"
import { apiError, withApiAudit } from "@/lib/server/api-response"
import { getReportFilePath, isValidReportId } from "@/lib/server/report-storage"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    return withApiAudit(request, "report:detail", async ({ requestId }) => {
        const guardError = await enforceApiGuard(request, { route: "report:detail", maxRequests: 120, windowMs: 60_000, requestId })
        if (guardError) return guardError

        const { reportId } = await params

        try {
            if (!isValidReportId(reportId)) {
                return apiError("Invalid report ID", { status: 400, code: "INVALID_REPORT_ID", requestId })
            }

            const filePath = getReportFilePath(reportId)

            if (!fs.existsSync(filePath)) {
                return apiError("Report not found", { status: 404, code: "REPORT_NOT_FOUND", requestId })
            }

            const content = fs.readFileSync(filePath, "utf-8")

            return new NextResponse(content, {
                headers: {
                    "Content-Type": "text/markdown; charset=utf-8",
                },
            })
        } catch (error) {
            console.error("Error reading report:", error)
            return apiError("Internal Server Error", { status: 500, code: "INTERNAL_ERROR", requestId })
        }
    })
}
