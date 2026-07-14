import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const dynamic = "force-dynamic";

/**
 * Keep this page free of Prisma / currentUser / redirects-in-try.
 * Those caused opaque production 500s after the Clerk domain move.
 * User sync + invite handling run inside createBusiness (and invite routes).
 */
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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
        <OnboardingForm />
      </div>
    </div>
  );
}
