import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { getPendingInviteForEmail } from "@/lib/team";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

function isNextNavigationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest) : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  let syncWarning: string | null = null;

  try {
    await syncClerkUser({
      id: user.id,
      emailAddresses: user.emailAddresses,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });
  } catch (error) {
    console.error("[onboarding] syncClerkUser failed:", error);
    syncWarning =
      error instanceof Error
        ? error.message
        : "Could not sync your account to the database.";
  }

  try {
    const ctx = await getBusinessContext();
    if (ctx) redirect("/dashboard");
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    console.error("[onboarding] getBusinessContext failed:", error);
  }

  const email = user.emailAddresses[0]?.emailAddress;
  if (email) {
    try {
      const pendingInvite = await getPendingInviteForEmail(email);
      if (pendingInvite) {
        redirect(`/invite/${pendingInvite.token}`);
      }
    } catch (error) {
      if (isNextNavigationError(error)) throw error;
      console.error("[onboarding] invite lookup failed:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-biz-gradient text-white font-bold text-xl mb-4">
            BP
          </div>
          <h1 className="text-2xl font-bold text-brand">
            Set up your business
          </h1>
          <p className="text-muted-foreground mt-2">
            Takes less than 2 minutes. You can add team members later.
          </p>
        </div>

        {syncWarning && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-left">
            <p className="font-medium">Account sync warning</p>
            <p className="mt-1 text-muted-foreground break-words">{syncWarning}</p>
            <p className="mt-2 text-muted-foreground">
              You can still try setting up. If it fails, check Vercel{" "}
              <code className="text-xs">DATABASE_URL</code> and Clerk keys.
            </p>
          </div>
        )}

        <OnboardingForm />
      </div>
    </div>
  );
}
