import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: null as null | { email: string; plan: string } }));
vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../src/lib/analytics", () => ({ track: vi.fn() }));

import { PricingPage } from "../src/components/billing/PricingPage";
import { LegalPage } from "../src/components/privacy/LegalPage";
import { pricingBodyHtml } from "../src/seo/prerender";
import {
  PRICING_ROWS,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PER_MONTH,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_SAVING,
  REFUND_DAYS,
} from "../src/seo/pricingContent";

const dollars = (price: string) => Number(price.replace("$", ""));

describe("PricingPage", () => {
  beforeEach(() => { auth.user = null; });

  it("shows both prices and what each plan includes", () => {
    render(<PricingPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Pricing" })).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText(PRO_YEARLY_PRICE)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`or \\${PRO_MONTHLY_PRICE} a month`))).toBeInTheDocument();

    const table = screen.getByRole("table");
    for (const row of PRICING_ROWS) {
      expect(within(table).getByRole("rowheader", { name: row.label })).toBeInTheDocument();
    }
    const api = within(table).getByRole("rowheader", { name: "API keys and webhooks" }).closest("tr")!;
    expect(within(api).getByText("No")).toBeInTheDocument();
    expect(within(api).getByText("Yes")).toBeInTheDocument();
  });

  it("says Pro is not on sale yet instead of offering a checkout", () => {
    render(<PricingPage />);
    expect(screen.getByText(/Pro is not on sale yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("tells a Pro account it is already on Pro", () => {
    auth.user = { email: "sam@example.com", plan: "pro" };
    render(<PricingPage />);
    expect(screen.getByText("You are on Pro.")).toBeInTheDocument();
    expect(screen.queryByText(/not on sale yet/)).toBeNull();
  });

  it("links to the refund policy and the terms", () => {
    render(<PricingPage />);
    expect(screen.getByRole("link", { name: "refund policy" })).toHaveAttribute("href", "/refunds");
    expect(screen.getByRole("link", { name: "terms" })).toHaveAttribute("href", "/terms");
  });
});

describe("pricing numbers", () => {
  it("quotes a yearly saving and monthly equivalent that match the prices", () => {
    const monthly = dollars(PRO_MONTHLY_PRICE);
    const yearly = dollars(PRO_YEARLY_PRICE);
    expect(dollars(PRO_YEARLY_SAVING)).toBe(monthly * 12 - yearly);
    expect(dollars(PRO_YEARLY_PER_MONTH)).toBeCloseTo(yearly / 12, 2);
  });

  it("puts the same plans in the prerendered copy", () => {
    const html = pricingBodyHtml();
    expect(html).toContain(`${PRO_YEARLY_PRICE} a year`);
    expect(html).toContain(`${PRO_MONTHLY_PRICE} a month`);
    for (const row of PRICING_ROWS) expect(html).toContain(row.label);
    expect(html).toContain('href="/refunds"');
  });
});

describe("refund policy", () => {
  it("states the refund window the pricing page promises, and who sells Pro", () => {
    render(<LegalPage kind="refunds" />);
    expect(screen.getByRole("heading", { level: 1, name: "Refund Policy" })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`${REFUND_DAYS} days`)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paddle, our reseller and the merchant of record/)).toBeInTheDocument();
    expect(screen.getAllByText(/support@explainthiswebsite\.com/).length).toBeGreaterThan(0);
  });

  it("names Paddle as the merchant of record in the terms", () => {
    render(<LegalPage kind="terms" />);
    expect(screen.getByText(/Paddle\.com is the Merchant of Record for all our orders/)).toBeInTheDocument();
  });
});
