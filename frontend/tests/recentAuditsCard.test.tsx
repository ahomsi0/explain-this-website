import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentAuditsCard } from "../src/components/admin/AdminInsightsCards";
import type { RecentAuditRow } from "../src/services/authApi";

const now = new Date().toISOString();

describe("RecentAuditsCard", () => {
  it("labels analyses made without an account as anonymous", () => {
    const rows: RecentAuditRow[] = [
      { id: "anon-1", url: "https://example.com/pricing", title: "Pricing", createdAt: now },
      { id: "abc", url: "https://acme.test/", title: "Acme", email: "dev@acme.test", createdAt: now },
    ];
    render(<RecentAuditsCard rows={rows} />);

    expect(screen.getByText(/anonymous/)).toBeInTheDocument();
    expect(screen.getByText(/dev@acme\.test/)).toBeInTheDocument();
    expect(screen.getAllByText(/ago$/)).toHaveLength(2);
  });
});
