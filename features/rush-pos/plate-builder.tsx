"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PLATE_STEPS,
  productsForPlateStep,
  type PlateStepId,
} from "@/lib/rush-pos/plate-builder";
import type { LocalProduct } from "@/lib/local-db/types";
import { Check, ChevronRight, SkipForward } from "lucide-react";

type PlateBuilderProps = {
  products: LocalProduct[];
  step: PlateStepId;
  onStepChange: (step: PlateStepId) => void;
  onPick: (product: LocalProduct) => void;
  onSkip: () => void;
  onCheckout: () => void;
  cartCount: number;
  subtotal: number;
  flashId: string | null;
  isPending?: boolean;
};

export function PlateBuilder({
  products,
  step,
  onStepChange,
  onPick,
  onSkip,
  onCheckout,
  cartCount,
  subtotal,
  flashId,
  isPending,
}: PlateBuilderProps) {
  const stepMeta = PLATE_STEPS.find((s) => s.id === step)!;
  const options = productsForPlateStep(products, step);
  const stepIndex = PLATE_STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PLATE_STEPS.map((s, i) => {
          const active = s.id === step;
          const done = i < stepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepChange(s.id)}
              className={cn(
                "min-h-[40px] shrink-0 rounded-full px-3 text-xs font-semibold",
                active
                  ? "bg-foreground text-background"
                  : done
                    ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {s.emoji} {s.label}
            </button>
          );
        })}
      </div>

      {step !== "pay" ? (
        <>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold">
                {stepMeta.emoji} Choose {stepMeta.label.toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                {stepMeta.optional
                  ? "Optional — skip if customer doesn’t want any"
                  : "Tap one to add, then continue"}
              </p>
            </div>
            {stepMeta.optional && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={onSkip}
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </Button>
            )}
          </div>

          {options.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No {stepMeta.label.toLowerCase()} items found. Tag products with
              categories like Rice, Proteins, Sides, Drinks — or name them
              clearly (Jollof, Chicken, Pure water).
              {stepMeta.optional && (
                <div className="mt-3">
                  <Button type="button" variant="secondary" onClick={onSkip}>
                    Skip this step
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {options.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onPick(product)}
                  className={cn(
                    "min-h-[132px] overflow-hidden rounded-2xl border border-border bg-card text-left transition-transform active:scale-[0.98]",
                    flashId === product.id && "ring-2 ring-emerald-500"
                  )}
                >
                  <div className="relative h-16 bg-muted">
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
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 font-semibold leading-tight">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {cartCount > 0 && !stepMeta.optional && options.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              className="w-full gap-1"
              onClick={onSkip}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {cartCount} item{cartCount === 1 ? "" : "s"} ready
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(subtotal)}</p>
          <Button
            type="button"
            size="lg"
            className="mt-4 min-h-[56px] w-full text-base font-bold"
            disabled={isPending || cartCount === 0}
            onClick={onCheckout}
          >
            <Check className="h-5 w-5" />
            Checkout
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            onClick={() => onStepChange("rice")}
          >
            Add more to plate
          </Button>
        </div>
      )}
    </div>
  );
}
