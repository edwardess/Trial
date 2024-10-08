import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher(["/group(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // Dynamically determine the host, either from environment variables or defaulting to localhost for local development.
  const baseHost = new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  ).host
  const host = req.headers.get("host")
  const reqPath = req.nextUrl.pathname
  const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_BASE_URL

  // Check if the user is authenticated
  const session = auth().sessionId

  // Protect the route if it's a protected path (e.g., /group)
  if (isProtectedRoute(req)) {
    if (!session) {
      console.log("No authenticated session, redirecting to sign-in.")
      return NextResponse.redirect(`${origin}/sign-in`)
    }
  }

  // Rewrite logic for specific cases when host is not equal to baseHost
  if (host && host !== baseHost && reqPath.includes("/group")) {
    try {
      const response = await fetch(`${origin}/api/domain?host=${host}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()

        // If the domain API returns a valid domain, rewrite the request URL
        if (data.status === 200 && data.domain) {
          return NextResponse.rewrite(
            new URL(reqPath, `https://${data.domain}/${reqPath}`),
          )
        }
      } else {
        console.error(
          `Error: Failed to fetch domain. Status: ${response.status}`,
        )
      }
    } catch (error) {
      console.error("Error in domain fetching:", error)
    }
  }

  // Proceed with the next response if no conditions match
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
