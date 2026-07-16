"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMealCombo,
  deactivateMealCombo,
  setFavoriteProducts,
} from "@/actions/rush-pos";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Star, Trash2 } from "lucide-react";

type ProductLite = {
  id: string;
  name: string;
  sellingPrice: number;
  category: string | null;
  quantity: number;
};

type ComboLite = {
  id: string;
  name: string;
  price: number;
  items: { product: { id: string; name: string } }[];
};

export function RushSetupClient({
  products,
  initialFavoriteIds,
  combos,
}: {
  products: ProductLite[];
  initialFavoriteIds: string[];
  combos: ComboLite[];
}) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>(initialFavoriteIds);
  const [pendingFav, startFav] = useTransition();
  const [pendingCombo, startCombo] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category ?? "").toLowerCase().includes(term)
    );
  }, [products, search]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 20) {
        toast({
          title: "Top 20 limit",
          description: "Remove one favorite before adding another.",
          variant: "destructive",
        });
        return prev;
      }
      return [...prev, id];
    });
  }

  function saveFavorites() {
    startFav(async () => {
      const result = await setFavoriteProducts(favorites);
      if (result.ok) {
        toast({ title: "Favorites saved", variant: "success" });
        router.refresh();
      }
    });
  }

  function toggleProduct(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function createCombo() {
    startCombo(async () => {
      const result = await createMealCombo({
        name,
        price: Number(price),
        productIds: selected,
      });
      if ("error" in result && result.error) {
        toast({ title: "Could not create combo", description: result.error, variant: "destructive" });
        return;
      }
      setName("");
      setPrice("");
      setSelected([]);
      toast({ title: "Combo created", variant: "success" });
      router.refresh();
    });
  }

  function removeCombo(id: string) {
    startCombo(async () => {
      await deactivateMealCombo(id);
      toast({ title: "Combo removed", variant: "success" });
      router.refresh();
    });
  }

  return (
    <AppShell
      title="Rush menu setup"
      subtitle="Favorites & combo meals"
      actions={
        <Link href="/sales" className="inline-flex items-center gap-1 text-sm font-medium text-brand">
          <ArrowLeft className="h-4 w-4" />
          Back to POS
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Top favorites</h2>
              <p className="text-sm text-muted-foreground">
                Up to 20 items shown first during rush ({favorites.length}/20)
              </p>
            </div>
            <Button type="button" onClick={saveFavorites} disabled={pendingFav}>
              {pendingFav ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save favorites"}
            </Button>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-12"
          />
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {filtered.map((p) => {
              const active = favorites.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleFavorite(p.id)}
                  className={cn(
                    "flex min-h-[56px] items-center gap-3 rounded-xl border px-3 text-left",
                    active ? "border-amber-500 bg-amber-500/10" : "bg-background"
                  )}
                >
                  <Star
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "fill-amber-500 text-amber-500" : "text-muted-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(p.sellingPrice)}
                      {p.category ? ` · ${p.category}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="font-semibold">Combo meals</h2>
            <p className="text-sm text-muted-foreground">
              One tap adds every product in the combo on Rush POS.
            </p>
          </div>

          {combos.length > 0 && (
            <div className="space-y-2">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="flex items-start justify-between gap-3 rounded-xl border px-3 py-3"
                >
                  <div>
                    <p className="font-medium">{combo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(combo.price)} ·{" "}
                      {combo.items.map((i) => i.product.name).join(", ")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCombo(combo.id)}
                    disabled={pendingCombo}
                    aria-label="Remove combo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-dashed p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="combo-name">Combo name</Label>
                <Input
                  id="combo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Combo 1 — Rice + Chicken + Coke"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="combo-price">Price</Label>
                <Input
                  id="combo-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="3500"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Select products in this combo ({selected.length} selected)
            </p>
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
              {products.map((p) => {
                const active = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={cn(
                      "min-h-[48px] rounded-lg border px-3 text-left text-sm",
                      active ? "border-emerald-500 bg-emerald-500/10" : ""
                    )}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <Button type="button" onClick={createCombo} disabled={pendingCombo}>
              {pendingCombo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create combo"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
