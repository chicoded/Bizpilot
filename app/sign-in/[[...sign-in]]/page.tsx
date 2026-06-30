import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { getSafeRedirectUrl } from "@/lib/redirect";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect_url?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = getSafeRedirectUrl(params.redirect_url, "/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
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
    </div>
  );
}
