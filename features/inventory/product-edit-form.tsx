"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProduct } from "@/actions/business";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { ProductImageField } from "@/features/inventory/product-image-field";

interface ProductEditFormProps {
  product: {
    id: string;
    name: string;
    category: string | null;
    barcode: string | null;
    purchasePrice: number;
    sellingPrice: number;
    quantity: number;
    reorderLevel: number;
    expiryDate: string | null;
    imageUrl: string | null;
  };
}

export function ProductEditForm({ product }: ProductEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProduct(product.id, formData);
      if (result.success) {
        setSaved(true);
        router.refresh();
        return;
      }
      setError(
        typeof result.error === "string"
          ? result.error
          : "Could not update product"
      );
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Cost price (₦)</Label>
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={product.purchasePrice}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling price (₦)</Label>
                  <Input
                    id="sellingPrice"
                    name="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={product.sellingPrice}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={product.quantity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder at</Label>
                  <Input
                    id="reorderLevel"
                    name="reorderLevel"
                    type="number"
                    min="0"
                    step="1"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    defaultValue={product.barcode ?? ""}
                  />
                </div>
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
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}
              {saved && (
                <p className="text-sm text-emerald-600 rounded-lg bg-emerald-50 px-3 py-2">
                  Product updated successfully
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
