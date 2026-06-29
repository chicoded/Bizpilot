"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/business";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProduct(formData);
      if (result.success) {
        router.push("/inventory");
      }
    });
  }

  return (
    <>
      <Header title="Add Product" />
      <main className="p-4 md:p-6 max-w-lg mx-auto">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inventory
        </Link>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product name *</Label>
                <Input id="name" name="name" required placeholder="Paracetamol 500mg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Cost price (₦)</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" min="0" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling price (₦)</Label>
                  <Input id="sellingPrice" name="sellingPrice" type="number" min="0" defaultValue="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="0" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder at</Label>
                  <Input id="reorderLevel" name="reorderLevel" type="number" min="0" defaultValue="5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="Medicine, Drinks, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input id="barcode" name="barcode" placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
                </div>
              </div>
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
