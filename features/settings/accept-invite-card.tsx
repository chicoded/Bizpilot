"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptTeamInvite } from "@/actions/team";
import { ROLE_LABELS } from "@/lib/team";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

interface AcceptInviteCardProps {
  token: string;
  businessName: string;
  email: string;
  role: Role;
  isSignedIn: boolean;
}

export function AcceptInviteCard({
  token,
  businessName,
  email,
  role,
  isSignedIn,
}: AcceptInviteCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`;

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptTeamInvite(token);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-10 px-6 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-biz-blue/10 mx-auto">
          <Users className="h-7 w-7 text-biz-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-biz-blue">Join {businessName}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;ve been invited as <strong>{ROLE_LABELS[role]}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{email}</p>
        </div>

        {isSignedIn ? (
          <Button
            size="lg"
            className="w-full"
            onClick={handleAccept}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Accept invite"
            )}
          </Button>
        ) : (
          <Button size="lg" className="w-full" asChild>
            <Link href={signInUrl}>Sign in to accept</Link>
          </Button>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
