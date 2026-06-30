import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getSafeRedirectUrl } from "@/lib/redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(params.redirect_url, "/onboarding");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
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
    </div>
  );
}
