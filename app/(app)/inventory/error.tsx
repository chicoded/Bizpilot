"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Inventory error:", error.digest ?? error.message);
  }, [error]);

  const detail = error.message || error.digest || "Unknown error";

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold text-biz-blue mb-2">
        Could not load inventory
      </h1>
      <p className="text-muted-foreground max-w-md mb-4">
        Something went wrong loading your products. Try refreshing the page.
      </p>
      <p className="text-xs text-muted-foreground max-w-lg mb-6 font-mono bg-muted px-3 py-2 rounded-lg break-all">
        {detail}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
