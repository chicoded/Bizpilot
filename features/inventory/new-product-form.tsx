"use client";

import { useEffect, useState, useTransition } from "react";
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
import { ProductTypePicker } from "@/features/inventory/product-type-picker";
import { RecipeBuilder } from "@/features/inventory/recipe-builder";
import { useLocalData } from "@/components/providers/local-data-provider";
import { createLocalProduct, listLocalProducts } from "@/lib/local-data/products";
import { parseProductFormData } from "@/lib/local-data/form";
import type { LocalProduct, LocalRecipeLine } from "@/lib/local-db/types";
import {
  type ProductTypeValue,
  usesHybridInventory,
} from "@/lib/product-types";

interface NewProductFormProps {
  initialBarcode?: string;
  suppliers?: { id: string; name: string }[];
  industry?: string | null;
}

export function NewProductForm({
  initialBarcode = "",
  suppliers = [],
  industry = null,
}: NewProductFormProps) {
  const router = useRouter();
  const { businessId } = useLocalData();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState(initialBarcode);
  const hybrid = usesHybridInventory(industry);
  const [productType, setProductType] =
    useState<ProductTypeValue>("READY_MADE");
  const [recipeLines, setRecipeLines] = useState<LocalRecipeLine[]>([]);
  const [catalog, setCatalog] = useState<LocalProduct[]>([]);

  useEffect(() => {
    if (!businessId || !hybrid) return;
    void listLocalProducts(businessId).then(setCatalog).catch(() => null);
  }, [businessId, hybrid]);

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

    if (hybrid) {
      formData.set("productType", productType);
      formData.set("recipeLines", JSON.stringify(recipeLines));
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

      await createLocalProduct(businessId, parsed.data);
      router.replace("/inventory");
    });
  }

  const isMenu = productType === "MENU_ITEM";
  const isIngredient = productType === "INGREDIENT";
  const isPackaging = productType === "PACKAGING";
  const showStock = !isMenu;
  const showBarcode = productType === "READY_MADE" || !hybrid;
  const showRecipe = hybrid && isMenu;
  const namePlaceholder = isMenu
    ? "e.g. Jollof Rice"
    : isIngredient
      ? "e.g. Rice, Chicken, Oil"
      : isPackaging
        ? "e.g. Takeaway pack, Cup"
        : "e.g. Coke, Water, Biscuits";

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
              {hybrid && (
                <ProductTypePicker value={productType} onChange={setProductType} />
              )}

              <ProductImageField disabled={isPending} />
              <div className="space-y-2">
                <Label htmlFor="name">
                  {isMenu ? "Food name *" : "Product name *"}
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder={namePlaceholder}
                  autoComplete="off"
                />
              </div>

              {isMenu && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Short menu description"
                  />
                </div>
              )}

              {(isIngredient || isPackaging) && (
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <select
                    id="unit"
                    name="unit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue={isIngredient ? "kg" : "pieces"}
                  >
                    <option value="kg">kg</option>
                    <option value="g">grams</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              )}

              <PackPricingFields disabled={isPending} />

              {showStock && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity / stock</Label>
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
              )}

              {isMenu && (
                <>
                  <input type="hidden" name="quantity" value="0" />
                  <input type="hidden" name="reorderLevel" value="0" />
                  <div className="space-y-2">
                    <Label htmlFor="prepTimeMinutes">Prep time (minutes)</Label>
                    <Input
                      id="prepTimeMinutes"
                      name="prepTimeMinutes"
                      type="text"
                      inputMode="numeric"
                      placeholder="10"
                    />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isPopular" value="true" />
                      Popular item
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isChefSpecial" value="true" />
                      Chef special
                    </label>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="category">
                  {isMenu ? "Menu category" : "Category"}
                </Label>
                <Input
                  id="category"
                  name="category"
                  placeholder={
                    isMenu
                      ? "Mains, Sides, Drinks…"
                      : "Medicine, Drinks, etc."
                  }
                />
              </div>

              {showRecipe && (
                <RecipeBuilder
                  products={catalog}
                  value={recipeLines}
                  onChange={setRecipeLines}
                />
              )}

              {suppliers.length > 0 && !isMenu && (
                <SupplierSelectField suppliers={suppliers} disabled={isPending} />
              )}

              {showBarcode && (
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
              )}

              {!showBarcode && (isIngredient || isPackaging) && (
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry date (optional)</Label>
                  <Input id="expiryDate" name="expiryDate" type="date" />
                </div>
              )}

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
