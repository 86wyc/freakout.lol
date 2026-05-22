import type Stripe from "stripe";
import type { PlanKey } from "@/lib/models/BillingModel";

const PLAN_KEYS = new Set<PlanKey>(["starter", "growth", "pro"]);

export function normalizePlanKey(value: string | null | undefined): PlanKey | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return PLAN_KEYS.has(normalized as PlanKey) ? (normalized as PlanKey) : null;
}

function configuredPricePlan(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;

  const mappings: Array<[string | undefined, PlanKey]> = [
    [process.env.STRIPE_PRO_PRICE_ID ?? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, "pro"],
    [
      process.env.STRIPE_GROWTH_PRICE_ID ??
        process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID ??
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
      "growth",
    ],
  ];

  return mappings.find(([configuredPriceId]) => configuredPriceId === priceId)?.[1] ?? null;
}

function metadataPlan(metadata: Stripe.Metadata | null | undefined): PlanKey | null {
  return normalizePlanKey(metadata?.plan);
}

export async function resolvePlanFromStripePrice(
  stripe: Stripe,
  price: Stripe.Price | null | undefined
): Promise<PlanKey> {
  const priceMetadataPlan = metadataPlan(price?.metadata);
  if (priceMetadataPlan) return priceMetadataPlan;

  const product = price?.product;
  if (product && typeof product !== "string" && !("deleted" in product)) {
    const productMetadataPlan = metadataPlan(product.metadata);
    if (productMetadataPlan) return productMetadataPlan;
  }

  if (typeof product === "string") {
    const retrievedProduct = await stripe.products.retrieve(product);
    if (!("deleted" in retrievedProduct)) {
      const productMetadataPlan = metadataPlan(retrievedProduct.metadata);
      if (productMetadataPlan) return productMetadataPlan;
    }
  }

  return configuredPricePlan(price?.id) ?? "starter";
}
