"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-2xl font-bold text-brand mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          We&apos;ve been notified and are looking into it. Please try again.
        </p>
        <Button onClick={() => reset()} size="lg">
          Try again
        </Button>
      </body>
    </html>
  );
}
