"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalData } from "@/components/providers/local-data-provider";
import { listLocalProducts } from "@/lib/local-data/products";
import { createLocalSale, listLocalSales } from "@/lib/local-data/sales";
import { createLocalKitchenOrder } from "@/lib/local-data/kitchen-orders";
import { createKitchenOrderFromSale } from "@/actions/rush-pos";
import { formatCurrency, cn } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/components/monitoring/monitoring-provider";
import {
  adaptiveProductRank,
  currentDaypart,
  suggestUpsells,
} from "@/lib/rush-pos/adaptive";
import {
  QUICK_NOTE_CHIPS,
  SERVICE_TYPES,
  type ServiceTypeValue,
} from "@/lib/rush-pos/constants";
import {
  readPeakModePreference,
  resolvePeakMode,
  writePeakModePreference,
} from "@/lib/rush-pos/peak-mode";
import {
  PLATE_STEPS,
  plateBucketForProduct,
  type PlateStepId,
} from "@/lib/rush-pos/plate-builder";
import { PlateBuilder } from "@/features/rush-pos/plate-builder";
import type { LocalProduct, LocalSale } from "@/lib/local-db/types";
import { subscribeLocalDataChanged } from "@/lib/sync/events";
import {
  History,
  ChefHat,
  Minus,
  Plus,
  Search,
  X,
  Check,
  Loader2,
  PackageOpen,
  Settings2,
  BarChart3,
  Zap,
  UtensilsCrossed,
} from "lucide-react";

type CartItem = {
  product: LocalProduct;
  quantity: number;
};

type ComboLite = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  productIds: string[];
};

type RushPosEngineProps = {
  favoriteIds?: string[];
  combos?: ComboLite[];
  aiSuggestionsEnabled?: boolean;
  kitchenEnabled?: boolean;
  comboMealsEnabled?: boolean;
};

function categoryKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function RushPosEngine({
  favoriteIds = [],
  combos = [],
  aiSuggestionsEnabled = true,
  kitchenEnabled = true,
  comboMealsEnabled = true,
}: RushPosEngineProps) {
  const { businessId, status } = useLocalData();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [splitCash, setSplitCash] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const [serviceType, setServiceType] = useState<ServiceTypeValue>("WALK_IN");
  const [notes, setNotes] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [flashId, setFlashId] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [peakPref, setPeakPref] = useState<"auto" | "on" | "off">("auto");
  const [peakActive, setPeakActive] = useState(false);
  const [posView, setPosView] = useState<"menu" | "plate">("menu");
  const [plateStep, setPlateStep] = useState<PlateStepId>("rice");

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  useEffect(() => {
    const pref = readPeakModePreference();
    setPeakPref(pref);
    setPeakActive(resolvePeakMode(pref));
    const id = window.setInterval(() => {
      setPeakActive(resolvePeakMode(readPeakModePreference()));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  function cyclePeakMode() {
    const order: Array<"auto" | "on" | "off"> = ["auto", "on", "off"];
    const next = order[(order.indexOf(peakPref) + 1) % order.length];
    writePeakModePreference(next);
    setPeakPref(next);
    setPeakActive(resolvePeakMode(next));
    if (resolvePeakMode(next)) {
      setCategory(favoriteIds.length > 0 ? "Favorites" : "Combos");
      setSearch("");
    }
  }

  const reload = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [productRows, saleRows] = await Promise.all([
        listLocalProducts(businessId),
        listLocalSales(businessId),
      ]);
      setProducts(productRows.filter((p) => p.quantity > 0));
      setSales(saleRows.slice(0, 200));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (status !== "ready" || !businessId) return;
    void reload();
  }, [status, businessId, reload]);

  useEffect(() => {
    return subscribeLocalDataChanged((detail) => {
      if (detail.type === "products" || detail.type === "all") {
        void reload();
      }
    });
  }, [reload]);

  const ranked = useMemo(
    () => adaptiveProductRank(products, sales, { favoriteIds: favoriteSet }),
    [products, sales, favoriteSet]
  );

  const categories = useMemo(() => {
    const fromProducts = new Set<string>();
    for (const p of products) {
      if (p.category?.trim()) fromProducts.add(p.category.trim());
    }
    const list = ["All"];
    if (favoriteIds.length > 0) list.push("Favorites");
    if (comboMealsEnabled && combos.length > 0) list.push("Combos");
    if (peakActive) {
      // Peak: only favorites, combos, drinks — hide long category lists.
      const hasDrinks = products.some((p) => plateBucketForProduct(p) === "drink");
      if (hasDrinks) list.push("Drinks");
      const peakList = list.filter((c) => c !== "All");
      return peakList.length > 0 ? peakList : ["All"];
    }
    for (const c of Array.from(fromProducts).sort()) list.push(c);
    return list;
  }, [
    products,
    favoriteIds.length,
    combos.length,
    comboMealsEnabled,
    peakActive,
  ]);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(categories[0] ?? "All");
    }
  }, [categories, category]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = ranked;
    if (peakActive && category === "Drinks") {
      list = list.filter((p) => plateBucketForProduct(p) === "drink");
    } else if (category === "Favorites") {
      list = list.filter((p) => favoriteSet.has(p.id));
    } else if (category !== "All" && category !== "Combos" && category !== "Drinks") {
      list = list.filter(
        (p) => categoryKey(p.category) === categoryKey(category)
      );
    } else if (peakActive && category === "All") {
      // Shouldn't happen often — prefer favorites when peak.
      list = favoriteSet.size
        ? list.filter((p) => favoriteSet.has(p.id))
        : list;
    }
    if (term && !peakActive) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.category ?? "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [ranked, category, search, favoriteSet, peakActive]);

  const recentOrders = useMemo(() => sales.slice(0, peakActive ? 5 : 10), [sales, peakActive]);

  const todayCashExpected = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return sales
      .filter((s) => new Date(s.createdAt) >= start && s.paymentMethod === "CASH")
      .reduce((sum, s) => sum + s.total, 0);
  }, [sales]);

  const suggestions = useMemo(() => {
    if (!aiSuggestionsEnabled || cart.length === 0) return [];
    return suggestUpsells(
      cart.map((c) => c.product.id),
      sales,
      products
    );
  }, [aiSuggestionsEnabled, cart, sales, products]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cart.reduce(
    (sum, i) => sum + i.product.sellingPrice * i.quantity,
    0
  );

  function flash(id: string) {
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 220);
  }

  function addProduct(product: LocalProduct, advancePlate = false) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    flash(product.id);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
    if (advancePlate && posView === "plate") {
      advancePlateStep();
    }
  }

  function advancePlateStep() {
    setPlateStep((current) => {
      const idx = PLATE_STEPS.findIndex((s) => s.id === current);
      const next = PLATE_STEPS[Math.min(idx + 1, PLATE_STEPS.length - 1)];
      return next?.id ?? current;
    });
  }

  function skipPlateStep() {
    advancePlateStep();
  }

  function addCombo(combo: ComboLite) {
    for (const productId of combo.productIds) {
      const product = products.find((p) => p.id === productId);
      if (product) addProduct(product);
    }
    flash(combo.id);
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function startLongPress(productId: string, delta: number) {
    stopLongPress();
    longPressRef.current = setInterval(() => updateQty(productId, delta), 90);
  }

  function stopLongPress() {
    if (longPressRef.current) {
      clearInterval(longPressRef.current);
      longPressRef.current = null;
    }
  }

  useEffect(() => () => stopLongPress(), []);

  function toggleNote(note: string) {
    setNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  }

  function recreateOrder(sale: LocalSale) {
    const next: CartItem[] = [];
    for (const item of sale.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      next.push({
        product,
        quantity: Math.min(item.quantity, product.quantity),
      });
    }
    if (next.length === 0) {
      toast({
        title: "Cannot recreate",
        description: "Products from that order are out of stock.",
        variant: "destructive",
      });
      return;
    }
    setCart(next);
    if (sale.serviceType) {
      setServiceType(sale.serviceType as ServiceTypeValue);
    }
    toast({ title: "Order loaded", description: sale.receiptNumber, variant: "success" });
  }

  function completeSale() {
    if (!businessId || cart.length === 0) return;

    let payment = paymentMethod;
    let noteParts = [...notes];

    if (paymentMethod === "SPLIT") {
      const cash = Number(splitCash) || 0;
      const transfer = Number(splitTransfer) || 0;
      if (cash + transfer <= 0) {
        toast({
          title: "Split payment",
          description: "Enter cash and/or transfer amounts.",
          variant: "destructive",
        });
        return;
      }
      if (Math.abs(cash + transfer - subtotal) > 0.5) {
        toast({
          title: "Split must match total",
          description: `Cash + transfer should equal ${formatCurrency(subtotal)}.`,
          variant: "destructive",
        });
        return;
      }
      payment = cash >= transfer ? "CASH" : "TRANSFER";
      noteParts = [
        ...noteParts,
        `SPLIT: CASH ${cash} TRANSFER ${transfer}`,
      ];
    }

    startTransition(async () => {
      const noteText = noteParts.join(", ");
      const result = await createLocalSale(businessId, {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentMethod: payment,
        notes: noteText || undefined,
        serviceType,
      });

      if (!("sale" in result)) {
        toast({
          title: "Sale failed",
          description:
            typeof result.error === "string" ? result.error : "Sale failed",
          variant: "destructive",
        });
        return;
      }

      const sale = result.sale;
      const kitchenItems = cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        notes: noteText || null,
      }));

      if (kitchenEnabled) {
        await createLocalKitchenOrder(businessId, {
          saleId: sale.id,
          orderNumber: sale.receiptNumber,
          serviceType,
          notes: noteText || null,
          items: kitchenItems,
        });
        void createKitchenOrderFromSale({
          saleId: sale.id,
          orderNumber: sale.receiptNumber,
          serviceType,
          notes: noteText || undefined,
          items: kitchenItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            notes: i.notes ?? undefined,
          })),
        });
        setLastTicket(sale.receiptNumber);
      }

      trackEvent("rush_sale_completed", {
        item_count: cartCount,
        total: subtotal,
        payment_method: paymentMethod,
        service_type: serviceType,
        daypart: currentDaypart(),
      });

      setCart([]);
      setNotes([]);
      setSplitCash("");
      setSplitTransfer("");
      if (posView === "plate") setPlateStep("rice");
      toast({
        title: "Order complete",
        description: kitchenEnabled
          ? `${sale.receiptNumber} · kitchen ticket ready`
          : `${sale.receiptNumber} · ${formatCurrency(subtotal)}`,
        variant: "success",
      });
      void reload();
    });
  }

  const peakLabel =
    peakPref === "on" ? "Peak ON" : peakPref === "off" ? "Peak OFF" : "Peak Auto";

  return (
    <AppShell
      title={peakActive ? "Peak POS" : "Rush POS"}
      subtitle={
        peakActive
          ? "Favorites · combos · drinks only"
          : `Adaptive · ${currentDaypart()} rush`
      }
      className={cn("!p-3 md:!p-4", cart.length > 0 && "pb-36")}
      actions={
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={cyclePeakMode}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              peakActive
                ? "bg-amber-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
            title="Tap to cycle: Auto → On → Off"
          >
            <Zap className="h-3.5 w-3.5" />
            {peakLabel}
          </button>
          {!peakActive && (
            <>
              <Link
                href="/sales/rush-setup"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand"
              >
                <Settings2 className="h-4 w-4" />
                Menu
              </Link>
              <Link
                href="/sales/rush-insights"
                className="hidden items-center gap-1 text-sm font-medium text-brand sm:inline-flex"
              >
                <BarChart3 className="h-4 w-4" />
                Insights
              </Link>
            </>
          )}
          {kitchenEnabled && (
            <Link
              href="/sales/kitchen"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand"
            >
              <ChefHat className="h-4 w-4" />
              Kitchen
            </Link>
          )}
          {!peakActive && (
            <Link
              href="/sales/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand"
            >
              <History className="h-4 w-4" />
              History
            </Link>
          )}
        </div>
      }
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => setPosView("menu")}
              className={cn(
                "min-h-[40px] rounded-full px-3 text-xs font-semibold",
                posView === "menu"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setPosView("plate");
                setPlateStep("rice");
              }}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-xs font-semibold",
                posView === "plate"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Build plate
            </button>
          </div>
          {todayCashExpected > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              Cash today · {formatCurrency(todayCashExpected)}
            </p>
          )}
        </div>

        {posView === "plate" ? (
          <PlateBuilder
            products={products}
            step={plateStep}
            onStepChange={setPlateStep}
            onPick={(p) => addProduct(p, true)}
            onSkip={skipPlateStep}
            onCheckout={completeSale}
            cartCount={cartCount}
            subtotal={subtotal}
            flashId={flashId}
            isPending={isPending}
          />
        ) : (
          <>
            {!peakActive && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu…"
                  className="h-14 pl-10 text-base"
                  enterKeyHint="search"
                />
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                    category === c
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {recentOrders.length > 0 && !peakActive && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent orders
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentOrders.map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => recreateOrder(sale)}
                      className="min-h-[60px] min-w-[120px] shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-left"
                    >
                      <p className="text-xs text-muted-foreground">
                        {sale.receiptNumber}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(sale.total)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {category === "Combos" && comboMealsEnabled ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {combos.map((combo) => (
                  <button
                    key={combo.id}
                    type="button"
                    onClick={() => addCombo(combo)}
                    className={cn(
                      "min-h-[140px] overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform active:scale-[0.98]",
                      flashId === combo.id && "ring-2 ring-emerald-500"
                    )}
                  >
                    <div className="relative h-20 bg-muted">
                      {combo.imageUrl ? (
                        <Image
                          src={combo.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl">
                          🍱
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold leading-tight">{combo.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(combo.price)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[140px] animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 font-medium">No menu items here</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/inventory/new">Add product</Link>
                </Button>
                {peakActive && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Peak mode shows favorites, combos, and drinks. Star top
                    items in Menu setup.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className={cn(
                      "min-h-[140px] overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform active:scale-[0.98]",
                      flashId === product.id && "ring-2 ring-emerald-500"
                    )}
                  >
                    <div className="relative h-20 bg-muted">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl font-bold text-muted-foreground">
                          {product.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      {favoriteSet.has(product.id) && (
                        <span className="absolute left-2 top-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          TOP
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 font-semibold leading-tight">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                      {!peakActive && (
                        <p className="text-[11px] text-muted-foreground">
                          {product.quantity} left
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {suggestions.length > 0 && !peakActive && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Suggest
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      className="min-h-[44px] rounded-full bg-background px-3 text-sm font-medium border"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!peakActive && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Service
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SERVICE_TYPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setServiceType(s.value)}
                        className={cn(
                          "min-h-[52px] rounded-xl text-sm font-semibold",
                          serviceType === s.value
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick notes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_NOTE_CHIPS.map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => toggleNote(note)}
                        className={cn(
                          "min-h-[44px] rounded-full px-3 text-sm font-medium border",
                          notes.includes(note)
                            ? "border-foreground bg-foreground text-background"
                            : "bg-background"
                        )}
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {cart.length > 0 && (
          <div className="space-y-3 rounded-2xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Cart</p>
              <button
                type="button"
                className="text-xs text-muted-foreground"
                onClick={() => setCart([])}
              >
                Clear
              </button>
            </div>
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.sellingPrice * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-muted"
                    onClick={() => updateQty(item.product.id, -1)}
                    onPointerDown={() => startLongPress(item.product.id, -1)}
                    onPointerUp={stopLongPress}
                    onPointerLeave={stopLongPress}
                    aria-label="Decrease"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-muted"
                    onClick={() => updateQty(item.product.id, 1)}
                    onPointerDown={() => startLongPress(item.product.id, 1)}
                    onPointerUp={stopLongPress}
                    onPointerLeave={stopLongPress}
                    aria-label="Increase"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-[44px] w-[44px] items-center justify-center rounded-xl text-muted-foreground"
                    onClick={() =>
                      setCart((prev) =>
                        prev.filter((i) => i.product.id !== item.product.id)
                      )
                    }
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ...PAYMENT_METHODS.filter((m) => m.value !== "CREDIT"),
                { value: "SPLIT", label: "Split" },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "min-h-[56px] rounded-xl text-sm font-semibold",
                    paymentMethod === m.value
                      ? "bg-emerald-600 text-white"
                      : "bg-muted"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {paymentMethod === "SPLIT" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Cash
                  <Input
                    type="number"
                    min={0}
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    className="mt-1 h-12"
                    placeholder="0"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Transfer
                  <Input
                    type="number"
                    min={0}
                    value={splitTransfer}
                    onChange={(e) => setSplitTransfer(e.target.value)}
                    className="mt-1 h-12"
                    placeholder="0"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {lastTicket && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
            Kitchen ticket {lastTicket} created.{" "}
            <Link href="/sales/kitchen" className="font-semibold underline">
              Open kitchen
            </Link>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[4.5rem] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {cartCount} items · {serviceType.replace("_", " ")}
              </p>
              <p className="text-lg font-bold">{formatCurrency(subtotal)}</p>
            </div>
            <Button
              type="button"
              size="lg"
              className="min-h-[56px] min-w-[140px] text-base font-bold"
              disabled={isPending}
              onClick={completeSale}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Checkout
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
