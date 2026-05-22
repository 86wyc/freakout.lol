import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  revalidatePath: vi.fn(),
  stripe: {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    customers: {
      create: vi.fn(),
    },
    products: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  billingModel: {
    findCustomerByFirmId: vi.fn(),
    getEntitlement: vi.fn(),
    getOrCreateUsageMeter: vi.fn(),
    upsertCustomer: vi.fn(),
    upsertEntitlement: vi.fn(),
    upsertSubscription: vi.fn(),
  },
  firmModel: {
    getActiveFirmSummaryForUser: vi.fn(),
  },
  db: {
    firm: {
      update: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: mocks.stripe,
}));

vi.mock("@/lib/models/BillingModel", () => {
  return {
    BillingModel: mocks.billingModel,
  };
});

vi.mock("@/lib/models/FirmModel", () => ({
  FirmModel: mocks.firmModel,
}));

vi.mock("@/lib/models/AuditLogModel", () => ({
  AuditLogModel: {
    record: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

const { createCheckoutSession, syncCheckoutSession } = await import(
  "@/lib/actions/billing"
);

describe("billing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "owner@example.com" },
    });
    mocks.firmModel.getActiveFirmSummaryForUser.mockResolvedValue({
      firmId: "firm-1",
      name: "Acme",
      plan: "starter",
      billingStatus: "trialing",
    });
  });

  it("includes checkout session id in the Stripe success URL", async () => {
    mocks.billingModel.findCustomerByFirmId.mockResolvedValue({
      id: "billing-customer-1",
      stripeCustomerId: "cus_1",
    });
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://stripe.example/checkout",
    });

    await expect(createCheckoutSession("price_growth")).rejects.toThrow(
      "REDIRECT:https://stripe.example/checkout"
    );

    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "https://localhost:3000/settings?billing=success&session_id={CHECKOUT_SESSION_ID}",
      })
    );
  });

  it("syncs a successful checkout subscription into local billing state", async () => {
    mocks.billingModel.findCustomerByFirmId.mockResolvedValue({
      id: "billing-customer-1",
      stripeCustomerId: "cus_1",
    });
    mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_1",
      mode: "subscription",
      metadata: { firmId: "firm-1" },
      customer: "cus_1",
      subscription: {
        id: "sub_1",
        status: "active",
        current_period_start: 1_800_000_000,
        current_period_end: 1_802_592_000,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        items: {
          data: [
            {
              price: {
                id: "price_growth",
                metadata: { plan: "growth" },
                recurring: { interval: "month" },
                product: "prod_1",
              },
            },
          ],
        },
      },
    });

    const result = await syncCheckoutSession("cs_1");

    expect(result).toEqual({
      status: "synced",
      plan: "growth",
      subscriptionStatus: "active",
    });
    expect(mocks.billingModel.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        billingCustomerId: "billing-customer-1",
        interval: "MONTHLY",
        status: "ACTIVE",
        stripePriceId: "price_growth",
        stripeSubscriptionId: "sub_1",
      })
    );
    expect(mocks.db.firm.update).toHaveBeenCalledWith({
      where: { id: "firm-1" },
      data: {
        plan: "growth",
        billingStatus: "active",
      },
    });
    expect(mocks.billingModel.upsertEntitlement).toHaveBeenCalledWith(
      "firm-1",
      "growth"
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects checkout sessions for another firm", async () => {
    mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_1",
      mode: "subscription",
      metadata: { firmId: "firm-2" },
    });

    const result = await syncCheckoutSession("cs_1");

    expect(result.status).toBe("error");
    expect(mocks.billingModel.upsertSubscription).not.toHaveBeenCalled();
    expect(mocks.db.firm.update).not.toHaveBeenCalled();
  });
});
