"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { ProductImageField } from "@/features/inventory/product-image-field";
import { BarcodeScanField } from "@/features/inventory/barcode-scan-field";
import { PackPricingFields } from "@/features/inventory/pack-pricing-fields";
import { parseMoneyInput } from "@/lib/pack-pricing";
import { SupplierSelectField } from "@/features/inventory/supplier-select-field";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  deleteLocalProduct,
  updateLocalProduct,
} from "@/lib/local-data/products";
import { parseProductFormData } from "@/lib/local-data/form";

interface ProductEditFormProps {
  product: {
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
  };
  suppliers?: { id: string; name: string }[];
  canDelete?: boolean;
}

export function ProductEditForm({
  product,
  suppliers = [],
  canDelete = false,
}: ProductEditFormProps) {
  const router = useRouter();
  const { businessId } = useLocalData();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState(product.barcode ?? "");
  const [isDeleting, setIsDeleting] = useState(false);

  function returnToInventory() {
    router.replace("/inventory");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    for (const key of ["purchasePrice", "sellingPrice"] as const) {
      const val = formData.get(key);
      if (typeof val === "string") {
        formData.set(key, String(parseMoneyInput(val)));
      }
    }

    startTransition(async () => {
      if (!businessId) {
        setError("Shop not ready yet. Wait a moment and try again.");
        return;
      }

      const parsed = await parseProductFormData(formData);
      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }

      const updated = await updateLocalProduct(
        businessId,
        product.id,
        parsed.data
      );
      if (!updated) {
        setError("Product not found on this device");
        return;
      }

      returnToInventory();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Remove "${product.name}" from inventory? Past sales stay in your records.`
      )
    ) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    startTransition(async () => {
      if (!businessId) {
        setIsDeleting(false);
        setError("Shop not ready yet. Wait a moment and try again.");
        return;
      }

      if (!canDelete) {
        setIsDeleting(false);
        setError("Only owners and managers can remove products");
        return;
      }

      const removed = await deleteLocalProduct(businessId, product.id);
      if (!removed) {
        setIsDeleting(false);
        setError("Product not found on this device");
        return;
      }

      returnToInventory();
    });
  }

  return (
    <>
      <Header title={product.name} subtitle="Edit product" />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
              <ProductImageField
                currentImageUrl={product.imageUrl}
                disabled={isPending}
              />
              <div className="space-y-2">
                <Label htmlFor="name">Product name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={product.name}
                />
              </div>
              <PackPricingFields
                defaultPurchasePrice={product.purchasePrice}
                defaultSellingPrice={product.sellingPrice}
                defaultUnitsPerPack={product.unitsPerPack}
                disabled={isPending}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    defaultValue={product.quantity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder at</Label>
                  <Input
                    id="reorderLevel"
                    name="reorderLevel"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    defaultValue={product.reorderLevel}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={product.category ?? ""}
                />
              </div>
              {suppliers.length > 0 && (
                <SupplierSelectField
                  suppliers={suppliers}
                  defaultValue={product.supplierId}
                  disabled={isPending}
                />
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BarcodeScanField
                  value={barcode}
                  onChange={setBarcode}
                  disabled={isPending}
                  productId={product.id}
                />
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    type="date"
                    defaultValue={product.expiryDate ?? ""}
                  />
                </div>
              </div>

              {error && (
                <p
                  id="product-form-error"
                  className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="sticky bottom-20 md:bottom-0 z-10 -mx-2 bg-background/95 backdrop-blur px-2 py-3 md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full touch-manipulation"
                  disabled={isPending || isDeleting}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full touch-manipulation text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  disabled={isPending || isDeleting || !canDelete}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Remove from inventory
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
