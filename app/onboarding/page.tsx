import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { getPendingInviteForEmail } from "@/lib/team";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const dynamic = "force-dynamic";

/**
 * Remap Clerk ids after domain moves, then send existing shops to the dashboard.
 * All redirects stay outside try/catch (catching NEXT_REDIRECT causes 500s).
 */
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let syncWarning: string | null = null;
  let hasBusiness = false;
  let inviteToken: string | null = null;

  const user = await currentUser().catch((error) => {
    console.error("[onboarding] currentUser failed:", error);
    return null;
  });

  if (!user) {
    redirect("/sign-in");
  }

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
    hasBusiness = Boolean(ctx);
  } catch (error) {
    console.error("[onboarding] getBusinessContext failed:", error);
  }

  if (hasBusiness) redirect("/dashboard");

  const email = user.emailAddresses[0]?.emailAddress;
  if (email) {
    try {
      const pendingInvite = await getPendingInviteForEmail(email);
      inviteToken = pendingInvite?.token ?? null;
    } catch (error) {
      console.error("[onboarding] invite lookup failed:", error);
    }
  }

  if (inviteToken) redirect(`/invite/${inviteToken}`);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle variant="full" />
      </div>
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-biz-gradient text-xl font-bold text-white">
            Z
          </div>
          <h1 className="text-2xl font-bold text-brand dark:text-foreground">
            Set up your business
          </h1>
          <p className="mt-2 text-muted-foreground">
            Takes less than 2 minutes. You can add team members later.
          </p>
        </div>

        {syncWarning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm dark:border-amber-800 dark:bg-amber-950/40">
            <p className="font-medium text-amber-900 dark:text-amber-200">Account sync warning</p>
            <p className="mt-1 break-words text-amber-800/80 dark:text-amber-300/80">{syncWarning}</p>
          </div>
        )}

        <OnboardingForm />
      </div>
    </div>
  );
}
