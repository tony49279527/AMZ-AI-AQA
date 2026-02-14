import assert from "node:assert/strict"
import { spawn } from "node:child_process"

const port = Number(process.env.API_SMOKE_PORT || 4017)
const token = process.env.API_SMOKE_TOKEN || "p0-smoke-token"
const baseUrl = `http://127.0.0.1:${port}`
const startupTimeoutMs = 45_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForServer() {
  const startedAt = Date.now()
  while (Date.now() - startedAt < startupTimeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/reports`)
      if (response.status === 200 || response.status === 401 || response.status === 429) {
        return
      }
    } catch {
      // server not ready yet
    }
    await sleep(400)
  }
  throw new Error(`Server did not become ready within ${startupTimeoutMs}ms`)
}

function startServer() {
  const child = spawn("pnpm", ["exec", "next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      API_ACCESS_TOKEN: token,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "dummy-smoke-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[server] ${chunk}`)
  })
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[server] ${chunk}`)
  })

  return child
}

async function stopServer(child) {
  if (!child || child.killed) return
  child.kill("SIGTERM")

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL")
      }
      resolve(undefined)
    }, 5_000)

    child.once("exit", () => {
      clearTimeout(timer)
      resolve(undefined)
    })
  })
}

async function request(path, init = {}, includeToken = true) {
  const headers = new Headers(init.headers || {})
  if (includeToken) {
    headers.set("x-api-token", token)
  }
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })
}

async function assertApiError(response, expectedStatus, expectedCode, label) {
  assert.equal(response.status, expectedStatus, `${label}: expected status ${expectedStatus}, got ${response.status}`)

  const requestIdHeader = response.headers.get("x-request-id")
  assert.ok(requestIdHeader, `${label}: missing x-request-id header`)

  const payload = await response.json()
  assert.equal(payload.code, expectedCode, `${label}: expected code ${expectedCode}, got ${payload.code}`)
  assert.ok(typeof payload.error === "string" && payload.error.length > 0, `${label}: missing error message`)
  assert.ok(typeof payload.requestId === "string" && payload.requestId.length > 0, `${label}: missing requestId in payload`)
  assert.equal(payload.requestId, requestIdHeader, `${label}: payload requestId should match header`)
}

async function run() {
  const server = startServer()

  try {
    await waitForServer()

    const unauth = await request("/api/reports", {}, false)
    await assertApiError(unauth, 401, "UNAUTHORIZED", "unauthorized guard")

    const invalidReportId = await request("/api/report/invalid!id")
    await assertApiError(invalidReportId, 400, "INVALID_REPORT_ID", "invalid report id")

    const invalidMetaId = await request("/api/report-meta/invalid!id")
    await assertApiError(invalidMetaId, 400, "INVALID_REPORT_ID", "invalid report meta id")

    const invalidFileRoute = await request(
      "/api/report-files/invalid!id",
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storagePath: "a.txt" }),
      }
    )
    await assertApiError(invalidFileRoute, 400, "INVALID_REPORT_ID", "invalid report files route")

    const chatMissingFields = await request(
      "/api/chat",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }
    )
    await assertApiError(chatMissingFields, 400, "MISSING_REQUIRED_FIELDS", "chat missing fields")

    const generateMissingFields = await request(
      "/api/reports/generate",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }
    )
    await assertApiError(generateMissingFields, 400, "MISSING_REQUIRED_FIELDS", "generate missing fields")

    console.log("API smoke tests passed.")
  } finally {
    await stopServer(server)
  }
}

run().catch((error) => {
  console.error("API smoke tests failed:", error)
  process.exitCode = 1
})
