import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { getPendingInviteForEmail } from "@/lib/team";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let syncWarning: string | null = null;
  let email: string | undefined;
  let inviteToken: string | null = null;
  let hasBusiness = false;
  let clerkUser:
    | {
        id: string;
        emailAddresses: { emailAddress: string }[];
        firstName: string | null;
        lastName: string | null;
        imageUrl: string;
      }
    | null = null;

  try {
    clerkUser = await currentUser();
  } catch (error) {
    console.error("[onboarding] currentUser failed:", error);
    syncWarning =
      "Clerk could not load your profile. Confirm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY match the zaplex.site instance, then redeploy.";
  }

  if (!clerkUser) {
    if (syncWarning) {
      // Session cookie present but Clerk Backend API failed — show setup UI with warning.
    } else {
      redirect("/sign-in");
    }
  }

  if (clerkUser) {
    email = clerkUser.emailAddresses[0]?.emailAddress;

    try {
      await syncClerkUser({
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      });
    } catch (error) {
      console.error("[onboarding] syncClerkUser failed:", error);
      syncWarning =
        error instanceof Error
          ? error.message
          : "Could not sync your account to the database.";
    }
  }

  try {
    const ctx = await getBusinessContext();
    hasBusiness = Boolean(ctx);
  } catch (error) {
    console.error("[onboarding] getBusinessContext failed:", error);
    if (!syncWarning) {
      syncWarning =
        error instanceof Error
          ? error.message
          : "Could not check existing business membership.";
    }
  }

  // Redirects must stay outside try/catch — catching NEXT_REDIRECT causes 500s.
  if (hasBusiness) redirect("/dashboard");

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
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-left">
            <p className="font-medium text-amber-900">Account sync warning</p>
            <p className="mt-1 text-amber-800/80 break-words">{syncWarning}</p>
          </div>
        )}

        <OnboardingForm />
      </div>
    </div>
  );
}
