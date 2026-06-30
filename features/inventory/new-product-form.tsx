"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/business";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductImageField } from "@/features/inventory/product-image-field";

interface NewProductFormProps {
  initialBarcode?: string;
}

export function NewProductForm({ initialBarcode = "" }: NewProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [barcode, setBarcode] = useState(initialBarcode);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.success) {
        if ("warning" in result && typeof result.warning === "string") {
          setWarning(result.warning);
        }
        router.push("/inventory");
        router.refresh();
        return;
      }
      setError(
        typeof result.error === "string"
          ? result.error
          : "Could not save product. Please try again."
      );
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
                <Input id="name" name="name" required placeholder="Paracetamol 500mg" />
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
                    defaultValue="0"
                    required
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
                    defaultValue="0"
                    required
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
                    defaultValue="0"
                    required
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
                    defaultValue="5"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Medicine, Drinks, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    name="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
                </div>
              </div>

              {warning && (
                <p className="text-sm text-amber-700 rounded-lg bg-amber-50 px-3 py-2">
                  {warning}
                </p>
              )}

              {error && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
