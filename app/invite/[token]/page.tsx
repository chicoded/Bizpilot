import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { acceptTeamInvite, getInviteDetails } from "@/actions/team";
import { AcceptInviteCard } from "@/features/settings/accept-invite-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = await auth();
  const invite = await getInviteDetails(token);

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center space-y-4">
            <h1 className="text-xl font-bold">Invite not found</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has expired. Ask your manager for a
              new invite.
            </p>
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = userId ? await currentUser() : null;
  const signedInEmail = user?.emailAddresses[0]?.emailAddress ?? null;

  if (userId && signedInEmail?.toLowerCase() === invite.email.toLowerCase()) {
    const result = await acceptTeamInvite(token);
    if (result.success) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white">
      <AcceptInviteCard
        token={token}
        businessName={invite.businessName}
        email={invite.email}
        role={invite.role}
        isSignedIn={!!userId}
        signedInEmail={signedInEmail}
      />
    </div>
  );
}
