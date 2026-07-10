"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductEditForm } from "@/features/inventory/product-edit-form";
import { useLocalData } from "@/components/providers/local-data-provider";
import { getLocalProduct } from "@/lib/local-data/products";
import { Skeleton } from "@/components/ui/skeleton";

type ProductEditPageClientProps = {
  productId: string;
  suppliers: { id: string; name: string }[];
  canDelete: boolean;
};

export function ProductEditPageClient({
  productId,
  suppliers,
  canDelete,
}: ProductEditPageClientProps) {
  const { businessId, status } = useLocalData();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    category: string | null;
    barcode: string | null;
    purchasePrice: number;
    sellingPrice: number;
    unitsPerPack: number;
    quantity: number;
    reorderLevel: number;
    expiryDate: string | null;
    imageUrl: string | null;
    supplierId: string | null;
  } | null>(null);

  useEffect(() => {
    if (status !== "ready" || !businessId) return;

    void (async () => {
      setLoading(true);
      const row = await getLocalProduct(businessId, productId);
      if (!row) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct({
        id: row.id,
        name: row.name,
        category: row.category,
        barcode: row.barcode,
        purchasePrice: row.purchasePrice,
        sellingPrice: row.sellingPrice,
        unitsPerPack: row.unitsPerPack,
        quantity: row.quantity,
        reorderLevel: row.reorderLevel,
        expiryDate: row.expiryDate,
        imageUrl: row.imageUrl,
        supplierId: null,
      });
      setLoading(false);
    })();
  }, [businessId, productId, status]);

  if (loading || status === "loading") {
    return (
      <div className="p-6 space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  return (
    <ProductEditForm
      product={product}
      suppliers={suppliers}
      canDelete={canDelete}
    />
  );
}
