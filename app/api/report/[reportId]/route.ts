import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
    const { reportId } = await params

    try {
        // 报告文件路径
        const filePath = path.join(process.cwd(), "content", "reports", `report_${reportId}.md`)

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 })
        }

        // 读取内容
        const content = fs.readFileSync(filePath, "utf-8")

        return new NextResponse(content, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
            },
        })
    } catch (error) {
        console.error("Error reading report:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
