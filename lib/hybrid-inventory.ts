import {
  defaultTracksStock,
  normalizeProductType,
  type ProductTypeValue,
} from "@/lib/product-types";
import type { LocalProduct, LocalRecipeLine } from "@/lib/local-db/types";

/** Products that can appear on POS (menu + ready-made). */
export function listPosSellableProducts(products: LocalProduct[]): LocalProduct[] {
  return products.filter((p) => {
    const type = normalizeProductType(p.productType);
    if (type === "INGREDIENT" || type === "PACKAGING") return false;
    // Ready-made / tracked stock: only show when in stock
    if (p.tracksStock !== false && type !== "MENU_ITEM") {
      return p.quantity > 0;
    }
    // Menu items: show if recipe can be fulfilled or no recipe yet
    return true;
  });
}

export function listRecipeComponents(products: LocalProduct[]): LocalProduct[] {
  return products.filter((p) => {
    const type = normalizeProductType(p.productType);
    return type === "INGREDIENT" || type === "PACKAGING";
  });
}

export async function assertSaleStockAvailable(
  getProduct: (id: string) => Promise<LocalProduct | undefined>,
  items: { productId: string; quantity: number }[]
): Promise<string | null> {
  const needed = new Map<string, { name: string; qty: number }>();

  for (const item of items) {
    const product = await getProduct(item.productId);
    if (!product) return "One or more products were not found";

    const type = normalizeProductType(product.productType);
    if (type === "INGREDIENT" || type === "PACKAGING") {
      return `${product.name} is not sold on POS`;
    }

    const lines = product.recipeLines ?? [];
    if (type === "MENU_ITEM" && lines.length > 0) {
      for (const line of lines) {
        const component = await getProduct(line.componentId);
        if (!component) {
          return `Recipe component missing for ${product.name}`;
        }
        const add = line.quantity * item.quantity;
        const prev = needed.get(component.id);
        needed.set(component.id, {
          name: component.name,
          qty: (prev?.qty ?? 0) + add,
        });
      }
      continue;
    }

    if (product.tracksStock !== false) {
      const prev = needed.get(product.id);
      needed.set(product.id, {
        name: product.name,
        qty: (prev?.qty ?? 0) + item.quantity,
      });
    }
  }

  for (const [id, req] of needed) {
    const product = await getProduct(id);
    if (!product) return `Missing stock item for ${req.name}`;
    if (product.quantity < req.qty) {
      return `Insufficient stock for ${product.name}`;
    }
  }

  return null;
}

/**
 * Build stock deltas for a sale (negative = deduct).
 * Menu items with recipes deduct components; ready-made deduct themselves.
 */
export async function buildSaleStockDeltas(
  getProduct: (id: string) => Promise<LocalProduct | undefined>,
  items: { productId: string; quantity: number }[]
): Promise<{ productId: string; delta: number; name: string }[] | { error: string }> {
  const deltas = new Map<string, { delta: number; name: string }>();

  const addDelta = (id: string, name: string, delta: number) => {
    const prev = deltas.get(id);
    deltas.set(id, {
      name,
      delta: (prev?.delta ?? 0) + delta,
    });
  };

  for (const item of items) {
    const product = await getProduct(item.productId);
    if (!product) return { error: "One or more products were not found" };

    const type = normalizeProductType(product.productType);
    const lines = product.recipeLines ?? [];

    if (type === "MENU_ITEM" && lines.length > 0) {
      for (const line of lines) {
        const component = await getProduct(line.componentId);
        if (!component) {
          return { error: `Recipe component missing for ${product.name}` };
        }
        addDelta(component.id, component.name, -(line.quantity * item.quantity));
      }
      continue;
    }

    if (product.tracksStock !== false) {
      addDelta(product.id, product.name, -item.quantity);
    }
  }

  return Array.from(deltas.entries()).map(([productId, v]) => ({
    productId,
    delta: v.delta,
    name: v.name,
  }));
}

export function parseRecipeLinesFromForm(
  formData: FormData
): LocalRecipeLine[] {
  const raw = formData.get("recipeLines");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const componentId = String(
          (row as { componentId?: string }).componentId ?? ""
        ).trim();
        const quantity = Number((row as { quantity?: number }).quantity);
        if (!componentId || !Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }
        return { componentId, quantity };
      })
      .filter((r): r is LocalRecipeLine => r != null);
  } catch {
    return [];
  }
}

export function resolveTracksStock(
  type: ProductTypeValue,
  explicit?: boolean | null
): boolean {
  if (explicit != null) return explicit;
  return defaultTracksStock(type);
}
