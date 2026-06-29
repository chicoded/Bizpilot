"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { identifyUser } from "@/components/monitoring/monitoring-provider";

export function AnalyticsIdentity() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    identifyUser(user.id, {
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name: user.fullName ?? "",
    });
  }, [user, isLoaded]);

  return null;
}
