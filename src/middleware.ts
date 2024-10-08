import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher(["/group(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // Dynamically determine the host, either from environment variables or defaulting to localhost for local development.
  const baseHost = process.env.NEXT_PUBLIC_BASE_URL || "localhost:3000"
  const host = req.headers.get("host")
  const reqPath = req.nextUrl.pathname
  const origin = req.nextUrl.origin

  // Protect the route if it's a protected path (e.g., /group)
  if (isProtectedRoute(req)) {
    auth().protect()
  }

  // Rewrite logic for specific cases when host is not equal to baseHost
  if (!baseHost.includes(host as string) && reqPath.includes("/group")) {
    try {
      const response = await fetch(`${origin}/api/domain?host=${host}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      // If the domain API returns a valid domain, rewrite the request URL
      if (data.status === 200 && data) {
        return NextResponse.rewrite(
          new URL(reqPath, `https://${data.domain}/${reqPath}`),
        )
      }
    } catch (error) {
      console.error("Error in domain fetching:", error)
      // Handle errors gracefully by continuing with the original response
    }
  }

  // Proceed with the next response if no conditions match
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
