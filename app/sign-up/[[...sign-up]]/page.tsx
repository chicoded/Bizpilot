import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getSafeRedirectUrl } from "@/lib/redirect";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(params.redirect_url, "/onboarding");

  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/sign-up"
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
        signInUrl={
          params.redirect_url
            ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
            : "/sign-in"
        }
      />
    </AuthShell>
  );
}
