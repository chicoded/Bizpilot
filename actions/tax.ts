"use server";

import { revalidatePath } from "next/cache";
import { TaxBusinessType, VatPricingMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBusinessContext, requireSectionAccess } from "@/lib/auth";
import { ensureTaxProfile } from "@/services/tax";
import { triggerTaxRecalculation } from "@/lib/tax/engine";
import { taxProfileSchema } from "@/lib/validations";

export async function updateTaxProfile(data: unknown) {
  try {
    const ctx = await requireSectionAccess("tax");
    const parsed = taxProfileSchema.safeParse(data);

    if (!parsed.success) {
      return { error: "Please complete all required tax profile fields" };
    }

    const {
      businessType,
      state,
      registeredBusiness,
      tin,
      vatRegistered,
      vatEnabled,
      vatPricingMode,
      annualRevenueBand,
    } = parsed.data;

    await prisma.businessTaxProfile.upsert({
      where: { businessId: ctx.businessId },
      create: {
        businessId: ctx.businessId,
        businessType: businessType as TaxBusinessType,
        state,
        registeredBusiness,
        tin: tin || null,
        vatRegistered,
        vatEnabled: vatRegistered ? vatEnabled : false,
        vatPricingMode: vatPricingMode as VatPricingMode,
        annualRevenueBand,
      },
      update: {
        businessType: businessType as TaxBusinessType,
        state,
        registeredBusiness,
        tin: tin || null,
        vatRegistered,
        vatEnabled: vatRegistered ? vatEnabled : false,
        vatPricingMode: vatPricingMode as VatPricingMode,
        annualRevenueBand,
      },
    });

    await triggerTaxRecalculation(ctx.businessId);

    revalidatePath("/tax");
    revalidatePath("/tax/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("updateTaxProfile:", error);
    return { error: "Failed to save tax profile" };
  }
}

export async function getOrCreateTaxProfile() {
  const ctx = await requireBusinessContext();
  return ensureTaxProfile(ctx.businessId);
}
