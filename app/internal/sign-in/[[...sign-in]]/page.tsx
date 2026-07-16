import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getSafeRedirectUrl } from "@/lib/redirect";
import { getInternalAdmin } from "@/lib/internal/auth";
import { InternalAuthShell } from "@/components/internal/internal-auth-shell";

export const dynamic = "force-dynamic";

const opsAppearance = {
  ...clerkAppearance,
  variables: {
    ...clerkAppearance.variables,
    colorPrimary: "#34d399",
    colorBackground: "#0f172a",
    colorText: "#e2e8f0",
    colorInputBackground: "#1e293b",
    colorInputText: "#f8fafc",
  },
};

export default async function InternalSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(params.redirect_url, "/internal");
  // Only allow redirects inside /internal after staff login.
  const safeInternalRedirect = redirectUrl.startsWith("/internal")
    ? redirectUrl
    : "/internal";

  const { userId } = await auth();
  if (userId) {
    const admin = await getInternalAdmin();
    if (admin) redirect(safeInternalRedirect);
    redirect("/internal/forbidden");
  }

  return (
    <InternalAuthShell>
      <SignIn
        routing="path"
        path="/internal/sign-in"
        appearance={opsAppearance}
        forceRedirectUrl={safeInternalRedirect}
        fallbackRedirectUrl={safeInternalRedirect}
        signUpUrl="/internal/forbidden"
      />
      <p className="max-w-sm text-center text-[11px] leading-relaxed text-slate-500">
        After sign-in, your email must be listed in{" "}
        <span className="font-mono text-slate-400">INTERNAL_ADMIN_EMAILS</span>{" "}
        (Vercel) to enter the console.
      </p>
    </InternalAuthShell>
  );
}
