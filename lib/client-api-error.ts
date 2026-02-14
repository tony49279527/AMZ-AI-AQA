type ApiErrorPayload = {
  error?: unknown
  code?: unknown
  requestId?: unknown
  details?: unknown
}

export class ClientApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly requestId?: string
  readonly details?: unknown

  constructor(message: string, status: number, options?: { code?: string; requestId?: string; details?: unknown }) {
    super(message)
    this.name = "ClientApiError"
    this.status = status
    this.code = options?.code
    this.requestId = options?.requestId
    this.details = options?.details
  }
}

export async function buildClientApiError(response: Response, fallbackMessage: string): Promise<ClientApiError> {
  let payload: ApiErrorPayload | null = null

  try {
    payload = (await response.json()) as ApiErrorPayload
  } catch {
    payload = null
  }

  const message = typeof payload?.error === "string" && payload.error.trim()
    ? payload.error.trim()
    : fallbackMessage

  const code = typeof payload?.code === "string" ? payload.code : undefined
  const requestId = typeof payload?.requestId === "string" ? payload.requestId : undefined

  return new ClientApiError(message, response.status, {
    code,
    requestId,
    details: payload?.details,
  })
}

export function formatClientErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof ClientApiError) {
    if (error.requestId) {
      return `${error.message}（请求ID: ${error.requestId}）`
    }
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
