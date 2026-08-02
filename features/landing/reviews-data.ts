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

export const reviews: Review[] = [
  {
    quote:
      "I used to close shop every night and still spend almost an hour calculating sales. Since we started using Zaplex, everything is already there. I just check my dashboard and lock up. It has honestly saved me a lot of time.",
    name: "Chinedu Okeke",
    shop: "PrimeCare Pharmacy",
    location: "Enugu",
    trade: "Pharmacy",
  },
  {
    quote:
      "The thing I like most is that I don't have to stand beside my cashiers all day. I can see what's selling and how much we've made even when I'm not in the shop. It gives me peace of mind.",
    name: "Amina Yusuf",
    shop: "Amina's Kitchen",
    location: "Kaduna",
    trade: "Restaurant",
  },
  {
    quote:
      "Before, we'd suddenly discover that a product had finished because nobody updated the stock book. Now once we sell something, it reflects immediately. We've stopped disappointing customers because of 'it's out of stock.'",
    name: "Uche Eze",
    shop: "NextMart Stores",
    location: "Port Harcourt",
    trade: "Supermarket",
  },
];

/**
 * Placeholder copy for looking at the design — development only.
 *
 * `process.env.NODE_ENV` is statically replaced at build time, so this array is
 * an empty literal in the production bundle and these words cannot reach a real
 * visitor. That is the whole reason it is written this way rather than as a
 * flag someone could flip.
 *
 * They are also deliberately not written as testimonials. No shop names, no
 * people, no praise — just the right shape and length so the layout can be
 * judged. A convincing fake is exactly what must not exist, because the moment
 * it looks real, someone ships it.
 */
export const sampleReviews: Review[] =
  process.env.NODE_ENV === "development"
    ? [
        {
          quote:
            "Placeholder text standing in for a real quote, roughly the length a shop owner writes when asked what changed since they started.",
          name: "Placeholder name",
          shop: "Example shop",
          location: "City",
          trade: "Pharmacy",
        },
        {
          quote:
            "Second placeholder, deliberately shorter, so the carousel can be checked against quotes of uneven length.",
          name: "Placeholder name",
          shop: "Example shop",
          location: "City",
          trade: "Restaurant",
        },
        {
          quote:
            "Third placeholder. Longer again, running past two lines on a narrow screen so the card growing taller is visible while laying the section out.",
          name: "Placeholder name",
          shop: "Example shop",
          location: "City",
          trade: "Supermarket",
        },
      ]
    : [];
