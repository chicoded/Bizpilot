"use client";

import { Moon, Sun } from "lucide-react";
import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { NotificationCenter } from "@/components/layout/notification-center";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/layout/command-palette";
import { useTheme } from "@/components/providers/theme-provider";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { resolved, setTheme } = useTheme();

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6 safe-area-pt">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationCenter />
          <button
            type="button"
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolved === "dark" ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <ClerkLoading>
            <div
              className="h-9 w-9 rounded-full bg-muted animate-pulse"
              aria-hidden
            />
          </ClerkLoading>
          <ClerkLoaded>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </header>
    </>
  );
}
