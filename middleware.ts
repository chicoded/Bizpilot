import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/offline",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/internal/sign-in(.*)",
  "/internal/forbidden",
  "/invite/(.*)",
  "/api/health",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { userId } = await auth();
  if (!userId) {
    // Staff console gets its own Clerk sign-in screen.
    const isInternal = request.nextUrl.pathname.startsWith("/internal");
    const signIn = new URL(
      isInternal ? "/internal/sign-in" : "/sign-in",
      request.url
    );
    signIn.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signIn);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
