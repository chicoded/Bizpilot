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

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold text-biz-blue mb-2">
        Could not load inventory
      </h1>
      <p className="text-muted-foreground max-w-md mb-4">
        Product data failed to load. This usually means your Supabase database
        needs a quick schema update.
      </p>
      <p className="text-sm text-muted-foreground max-w-lg mb-6 font-mono bg-muted px-3 py-2 rounded-lg">
        ALTER TABLE &quot;products&quot; ADD COLUMN IF NOT EXISTS &quot;imageUrl&quot; TEXT;
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
