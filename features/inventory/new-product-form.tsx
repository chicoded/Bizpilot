"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductImageField } from "@/features/inventory/product-image-field";
import { BarcodeScanField } from "@/features/inventory/barcode-scan-field";
import { PackPricingFields } from "@/features/inventory/pack-pricing-fields";
import { parseMoneyInput } from "@/lib/pack-pricing";
import { SupplierSelectField } from "@/features/inventory/supplier-select-field";
import { useLocalData } from "@/components/providers/local-data-provider";
import { createLocalProduct } from "@/lib/local-data/products";
import { parseProductFormData } from "@/lib/local-data/form";

interface NewProductFormProps {
  initialBarcode?: string;
  suppliers?: { id: string; name: string }[];
}

export function NewProductForm({
  initialBarcode = "",
  suppliers = [],
}: NewProductFormProps) {
  const router = useRouter();
  const { businessId } = useLocalData();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState(initialBarcode);

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

    for (const key of ["quantity", "reorderLevel"] as const) {
      const val = formData.get(key);
      if (val === "" || val === null) {
        formData.set(key, key === "reorderLevel" ? "5" : "0");
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

      // Local save is instant; cloud sync runs in the background.
      await createLocalProduct(businessId, parsed.data);
      router.replace("/inventory");
    });
  }

  return (
    <>
      <Header title="Add Product" />
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
              <ProductImageField disabled={isPending} />
              <div className="space-y-2">
                <Label htmlFor="name">Product name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Paracetamol 500mg"
                  autoComplete="off"
                />
              </div>
              <PackPricingFields disabled={isPending} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    defaultValue=""
                    autoComplete="off"
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
                    placeholder="5"
                    defaultValue="5"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Medicine, Drinks, etc." />
              </div>
              {suppliers.length > 0 && (
                <SupplierSelectField suppliers={suppliers} disabled={isPending} />
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BarcodeScanField
                  value={barcode}
                  onChange={setBarcode}
                  disabled={isPending}
                />
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
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

              <div className="sticky bottom-20 md:bottom-0 z-10 -mx-2 bg-background/95 backdrop-blur px-2 py-3 md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                <Button type="submit" size="lg" className="w-full touch-manipulation" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
