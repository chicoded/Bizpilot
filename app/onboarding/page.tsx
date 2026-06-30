import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { getPendingInviteForEmail } from "@/lib/team";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  await syncClerkUser({
    id: user.id,
    emailAddresses: user.emailAddresses,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  });

  const ctx = await getBusinessContext();
  if (ctx) redirect("/dashboard");

  const email = user.emailAddresses[0]?.emailAddress;
  if (email) {
    const pendingInvite = await getPendingInviteForEmail(email);
    if (pendingInvite) {
      redirect(`/invite/${pendingInvite.token}`);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-biz-gradient text-white font-bold text-xl mb-4">
            BP
          </div>
          <h1 className="text-2xl font-bold text-biz-blue">
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
