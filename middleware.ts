export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - login page
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png, public assets
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
