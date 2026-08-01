/**
 * Real customer reviews only.
 *
 * This file ships empty on purpose. The reviews section renders nothing while
 * the list is empty, so the site never shows a quote nobody said. Invented
 * testimonials on a page that takes payment are deceptive to buyers and are
 * treated as false advertising under the FCCPA in Nigeria and equivalent
 * consumer-protection rules elsewhere — the risk is not worth the section.
 *
 * Where they come from
 * --------------------
 * Settings → Help & support has a "How is Zaplex working for your shop?" card.
 * What an owner writes there arrives in the support inbox tagged [REVIEW], with
 * a line recording whether they agreed to be quoted publicly. Nothing reaches
 * this file automatically: a person reads it, checks the shop is still happy to
 * be named, and copies it across. That gap is deliberate.
 *
 * To publish one, get the shop owner's permission to use their words and name,
 * then add an entry:
 *
 *   {
 *     quote: "Their exact words, trimmed but not reworded.",
 *     name: "Owner's name as they want it shown",
 *     shop: "Shop name",
 *     location: "City",
 *     trade: "Pharmacy",
 *   }
 *
 * Keep the quote verbatim. Tightening someone's grammar into marketing copy is
 * how a real review starts sounding like a fake one.
 */
export type Review = {
  quote: string;
  name: string;
  shop: string;
  location: string;
  trade: string;
};

export const reviews: Review[] = [];
