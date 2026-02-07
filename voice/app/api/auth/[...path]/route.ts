import { NextRequest, NextResponse } from 'next/server'

// Auth is disabled when NEON_AUTH_COOKIE_SECRET is not set
const authEnabled = !!(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET)

let authHandler: { GET: any; POST: any } | null = null

if (authEnabled) {
  const { createNeonAuth } = require('@neondatabase/auth/next/server')
  const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
  })
  authHandler = auth.handler()
}

const stub = async () => NextResponse.json({ user: null }, { status: 200 })

export const GET = authHandler?.GET ?? stub
export const POST = authHandler?.POST ?? stub
