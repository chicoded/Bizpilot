"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background safe-area-pt safe-area-pb">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 dark:bg-amber-950/50 mb-6">
        <WifiOff className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold text-brand mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground text-center max-w-sm mb-4">
        Shop data stays on this device. If you already opened Zaplex while
        online, try POS or Inventory below. First install still needs a short
        online open.
      </p>
      <p className="text-xs text-muted-foreground text-center max-w-sm mb-8 flex items-center justify-center gap-2">
        <HardDrive className="h-4 w-4" />
        Backup to Gmail/Drive when you&apos;re back online.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full h-14"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </Button>
        <Link href="/sales" className="w-full">
          <Button variant="outline" size="lg" className="w-full h-14">
            Open POS
          </Button>
        </Link>
        <Link href="/inventory" className="w-full">
          <Button variant="outline" size="lg" className="w-full h-14">
            Open Inventory
          </Button>
        </Link>
        <Link href="/reports?period=today" className="w-full">
          <Button variant="ghost" size="lg" className="w-full h-12">
            Today&apos;s report
          </Button>
        </Link>
      </div>
    </div>
  );
}
