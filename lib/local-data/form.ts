import { productSchema } from "@/lib/validations";
import { parseMoneyInput } from "@/lib/pack-pricing";
import type { ProductInput } from "@/lib/local-data/products";
import {
  defaultTracksStock,
  normalizeProductType,
} from "@/lib/product-types";
import { parseRecipeLinesFromForm } from "@/lib/hybrid-inventory";

function formValue(value: FormDataEntryValue | null): string | undefined {
  if (value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

async function imageFromForm(formData: FormData): Promise<string | null | undefined> {
  const removeImage = formData.get("removeImage") === "true";
  if (removeImage) return null;

  const imageFile = formData.get("image");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(imageFile);
  });
}

export async function parseProductFormData(
  formData: FormData
): Promise<{ data: ProductInput } | { error: string }> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formValue(formData.get("sku")),
    barcode: formValue(formData.get("barcode")),
    category: formValue(formData.get("category")),
    productType: formValue(formData.get("productType")) ?? "READY_MADE",
    description: formValue(formData.get("description")),
    unit: formValue(formData.get("unit")),
    prepTimeMinutes: formValue(formData.get("prepTimeMinutes")),
    isPopular: formData.get("isPopular") === "true" || formData.get("isPopular") === "on",
    isChefSpecial:
      formData.get("isChefSpecial") === "true" ||
      formData.get("isChefSpecial") === "on",
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    unitsPerPack: formData.get("unitsPerPack") ?? "1",
    quantity: formData.get("quantity"),
    reorderLevel: formData.get("reorderLevel"),
    batchNumber: formValue(formData.get("batchNumber")),
    expiryDate: formValue(formData.get("expiryDate")),
  });

  if (!parsed.success) {
    const message = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .find(Boolean);
    return { error: message ?? "Please check your inputs" };
  }

  const imageUrl = await imageFromForm(formData);
  const productType = normalizeProductType(parsed.data.productType);
  const recipeLines = parseRecipeLinesFromForm(formData);

  if (productType === "MENU_ITEM" && recipeLines.length === 0) {
    // Allow saving without recipe (can add later), but warn softly — not an error.
  }

  return {
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      barcode: parsed.data.barcode ?? null,
      category: parsed.data.category ?? null,
      productType,
      description: parsed.data.description ?? null,
      unit: parsed.data.unit ?? null,
      prepTimeMinutes: parsed.data.prepTimeMinutes ?? null,
      isPopular: Boolean(parsed.data.isPopular),
      isChefSpecial: Boolean(parsed.data.isChefSpecial),
      tracksStock: defaultTracksStock(productType),
      recipeLines,
      purchasePrice: parseMoneyInput(String(parsed.data.purchasePrice)),
      sellingPrice: parseMoneyInput(String(parsed.data.sellingPrice)),
      unitsPerPack: parsed.data.unitsPerPack,
      quantity: parsed.data.quantity,
      reorderLevel: parsed.data.reorderLevel,
      batchNumber: parsed.data.batchNumber ?? null,
      expiryDate: parsed.data.expiryDate || null,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    },
  };
}
