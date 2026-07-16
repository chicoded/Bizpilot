"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getBusinessContext, syncClerkUser } from "@/lib/auth";
import { supportTicketSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";

export async function createSupportTicket(input: {
  summary: string;
  details?: string;
  pageUrl?: string;
  email?: string;
}) {
  try {
    const parsed = supportTicketSchema.safeParse(input);
    if (!parsed.success) {
      const message =
        Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .find(Boolean) ?? "Please check your report and try again.";
      return { error: message };
    }

    const { userId } = await auth();
    let email =
      parsed.data.email?.trim() ||
      null;

    if (userId) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        await syncClerkUser({
          id: clerkUser.id,
          emailAddresses: clerkUser.emailAddresses,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        }).catch(() => null);
        email =
          email ||
          clerkUser.emailAddresses[0]?.emailAddress?.trim().toLowerCase() ||
          null;
      }
    }

    const ctx = userId ? await getBusinessContext().catch(() => null) : null;

    const ticket = await prisma.supportTicket.create({
      data: {
        summary: parsed.data.summary.trim(),
        details: parsed.data.details?.trim() || null,
        pageUrl: parsed.data.pageUrl?.trim() || null,
        email,
        userId: userId ?? null,
        businessId: ctx?.businessId ?? null,
      },
      select: { id: true },
    });

    return { success: true as const, ticketId: ticket.id };
  } catch (error) {
    console.error("[createSupportTicket]", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return {
        error:
          "Support inbox is not ready yet. Run database/repair-support-tickets.sql in Supabase, then try again.",
      };
    }
    const detail = error instanceof Error ? error.message : "";
    if (/support_tickets|SupportTicketStatus|does not exist|P2021|P2022/i.test(detail)) {
      return {
        error:
          "Support inbox is not ready yet. Run database/repair-support-tickets.sql in Supabase, then try again.",
      };
    }
    return { error: "Could not submit your report. Please try again." };
  }
}
