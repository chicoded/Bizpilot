"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Package, Users, ShoppingCart, LayoutDashboard, Sparkles, Settings, Receipt, CreditCard, Truck, BarChart3 } from "lucide-react";
import { mainNavItems } from "@/lib/app-navigation";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/sales": ShoppingCart,
  "/inventory": Package,
  "/customers": Users,
  "/expenses": Receipt,
  "/debts": CreditCard,
  "/suppliers": Truck,
  "/reports": BarChart3,
  "/ai": Sparkles,
  "/settings": Settings,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    const onOpen = () => setOpen(true);
    window.addEventListener("bizpilot:open-command", onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("bizpilot:open-command", onOpen);
    };
  }, [onKeyDown]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close command menu"
        onClick={() => setOpen(false)}
      />
      <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
        <Command
          className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          shouldFilter
        >
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages…"
              className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigate">
              {mainNavItems.map((item) => {
                const Icon = iconMap[item.href] ?? LayoutDashboard;
                return (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.description ?? ""}`}
                    onSelect={() => navigate(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-brand shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("bizpilot:open-command"))}
      className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Open command menu"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search</span>
      <kbd className="text-[10px] border rounded px-1">⌘K</kbd>
    </button>
  );
}
