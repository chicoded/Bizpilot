"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  async function handleInstall() {
    if (isIOS) {
      setShowIOSHelp(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-24 left-4 right-4 z-40 md:bottom-6 md:left-auto md:right-6 md:max-w-sm safe-area-pb"
      >
        <div className="rounded-2xl border border-biz-blue/20 bg-white/95 backdrop-blur-xl shadow-glass p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-biz-gradient text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Install BizPilot</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for fast POS access — works like a native app.
              </p>
              {showIOSHelp && (
                <p className="text-xs text-biz-blue mt-2 flex items-center gap-1">
                  <Share className="h-3 w-3" />
                  Tap Share → Add to Home Screen
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            className="w-full mt-3 h-11"
            onClick={handleInstall}
          >
            <Download className="h-4 w-4" />
            {isIOS ? "How to Install" : "Install App"}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
