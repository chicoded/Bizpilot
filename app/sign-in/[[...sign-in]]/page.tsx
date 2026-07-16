import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getSafeRedirectUrl } from "@/lib/redirect";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(params.redirect_url, "/dashboard");

  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl}
        signUpUrl={
          params.redirect_url
            ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
            : "/sign-up"
        }
      />
    </AuthShell>
  );
}
