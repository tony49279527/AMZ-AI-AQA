const apiAccessToken = process.env.NEXT_PUBLIC_API_ACCESS_TOKEN

export function buildClientApiHeaders(initial?: HeadersInit): HeadersInit {
  const headers = new Headers(initial)

  if (apiAccessToken) {
    headers.set("x-api-token", apiAccessToken)
  }

  return headers
}
