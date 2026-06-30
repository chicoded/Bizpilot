"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold text-biz-blue mb-2">
        Something went wrong
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">
        We couldn&apos;t load this page. If you just updated the app, make sure
        your Supabase database has the latest schema.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
