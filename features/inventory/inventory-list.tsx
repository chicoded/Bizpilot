"use client";

import { useMemo, useState } from "react";
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((product) => {
      const isLowStock = product.quantity <= product.reorderLevel;
      const isExpiring =
        product.expiryDate &&
        product.expiryDate <= addDays(new Date(), 30) &&
        product.expiryDate >= new Date();

      if (filter === "low" && !isLowStock) return false;
      if (filter === "expiring" && !isExpiring) return false;

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q)
      );
    });
  }, [products, search, filter]);

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
        options={[
          { value: "all", label: "All" },
          { value: "low", label: "Low stock" },
          { value: "expiring", label: "Expiring" },
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
            const isLowStock = product.quantity <= product.reorderLevel;
            const isExpiring =
              product.expiryDate &&
              product.expiryDate <= addDays(new Date(), 30);

            return (
              <ProductCard
                key={product.id}
                product={product}
                currency={currency}
                isLowStock={isLowStock}
                isExpiring={!!isExpiring}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
