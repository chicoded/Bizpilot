"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ProductCard } from "@/features/inventory/product-card";
import { addDays } from "date-fns";

type Filter = "all" | "low" | "expiring";

interface InventoryProduct {
  id: string;
  name: string;
  category: string | null;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: Date | null;
  imageUrl: string | null;
}

interface InventoryListProps {
  products: InventoryProduct[];
  currency: string;
}

export function InventoryList({ products, currency }: InventoryListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  /**
   * Expiry state, kept in one place so the card and the filter cannot disagree.
   *
   * The filter used to require expiryDate >= now, which quietly excluded stock
   * that had already expired — so filtering for expiry problems hid the worst
   * ones. Expired stock is a problem you must see, not one you have missed.
   */
  const expiryStateOf = useCallback((expiryDate: Date | null) => {
    if (!expiryDate) return { isExpiring: false, isExpired: false };
    const now = new Date();
    if (expiryDate < now) return { isExpiring: false, isExpired: true };
    return {
      isExpiring: expiryDate <= addDays(now, 30),
      isExpired: false,
    };
  }, []);

  const counts = useMemo(() => {
    let low = 0;
    let expiring = 0;
    for (const product of products) {
      if (product.quantity <= product.reorderLevel) low += 1;
      const { isExpiring, isExpired } = expiryStateOf(product.expiryDate);
      if (isExpiring || isExpired) expiring += 1;
    }
    return { low, expiring };
  }, [products, expiryStateOf]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((product) => {
      const isLowStock = product.quantity <= product.reorderLevel;
      const { isExpiring, isExpired } = expiryStateOf(product.expiryDate);

      if (filter === "low" && !isLowStock) return false;
      if (filter === "expiring" && !isExpiring && !isExpired) return false;

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q)
      );
    });
  }, [products, search, filter, expiryStateOf]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search inventory"
        />
      </div>

      <SegmentedControl
        label="Inventory filter"
        value={filter}
        onChange={setFilter}
        // Counts on the tab, so you know whether it is worth opening.
        options={[
          { value: "all", label: `All ${products.length}` },
          { value: "low", label: `Low stock ${counts.low}` },
          { value: "expiring", label: `Expiring ${counts.expiring}` },
        ]}
      />

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          {search || filter !== "all"
            ? "No products match your search or filter."
            : "No products to show."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const { isExpiring, isExpired } = expiryStateOf(product.expiryDate);

            return (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                isLowStock={product.quantity <= product.reorderLevel}
                isExpiring={isExpiring}
                isExpired={isExpired}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
