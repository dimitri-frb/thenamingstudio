// Single source of truth for paid plans, used by the pricing section, the
// paywall, and the checkout flow so prices never drift apart.

export type PlanId = "founder" | "launch";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // EUR, one-time
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  founder: {
    id: "founder",
    name: "Founder",
    price: 19,
    tagline: "Everything to decide",
    highlight: true,
    features: [
      "60+ names, unlimited regenerations",
      "Live domain search across TLDs",
      "INPI / EUIPO trademark conflict check 🇫🇷",
      "Logo & color directions",
    ],
  },
  launch: {
    id: "launch",
    name: "Launch",
    price: 89,
    tagline: "Go from name to filed",
    features: [
      "Everything in Founder",
      "Domain registration handled",
      "Trademark filing with INPI",
      "Full brand book (PDF)",
    ],
  },
};

export const eur = (n: number) => `€${n}`;
