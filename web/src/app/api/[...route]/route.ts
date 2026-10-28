import { handleApiRequest } from "@/lib/fallback-state"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.HEARTWOOD_BACKEND_URL ?? "https://satin-log-2358.fly.dev"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ route: string[] }> }
): Promise<NextResponse> {
  const { route } = await props.params
  const path = "/" + route.join("/")
  const url = new URL(request.url)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 600)
    const backendRes = await fetch(`${BACKEND_URL}/api${path}${url.search}`, {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeoutId)
    if (backendRes.ok) {
      const data: unknown = await backendRes.json()
      return NextResponse.json(data)
    }
  } catch {
  }

  return handleApiRequest("GET", path, null)
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ route: string[] }> }
): Promise<NextResponse> {
  const { route } = await props.params
  const path = "/" + route.join("/")
  let body: unknown = null

  try {
    body = await request.json()
  } catch {
    body = null
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 600)
    const backendRes = await fetch(`${BACKEND_URL}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (backendRes.ok) {
      const data: unknown = await backendRes.json()
      return NextResponse.json(data)
    }
  } catch {
  }

  return handleApiRequest("POST", path, body)
}
