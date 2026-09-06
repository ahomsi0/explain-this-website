import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ComparePage } from "../src/components/compare/ComparePage";
import { compareLive, type AuditComparison } from "../src/services/authApi";

vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: { id: 7 } }) }));
vi.mock("../src/services/authApi", () => ({ compareLive: vi.fn() }));
vi.mock("../src/components/auth/AuthModal", () => ({ AuthModal: () => null }));
vi.mock("../src/components/auth/AuditComparison", () => ({
  AuditComparison: ({ comparison }: { comparison: AuditComparison }) => <div>{comparison.before.url}</div>,
}));

it("aborts cancelled comparisons and ignores stale results while a new request runs", async () => {
  let resolveOld!: (value: AuditComparison) => void;
  let rejectNew!: (reason: Error) => void;
  vi.mocked(compareLive)
    .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectNew = reject; }));
  render(<ComparePage />);
  fireEvent.change(screen.getByLabelText("Your site"), { target: { value: "one.example.com" } });
  fireEvent.change(screen.getByLabelText("Competitor"), { target: { value: "two.example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Compare sites" }));
  const oldSignal = vi.mocked(compareLive).mock.calls[0][2];
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(oldSignal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Compare sites" }));
  await act(async () => resolveOld({ before: { url: "stale result" } } as AuditComparison));
  expect(screen.queryByText("stale result")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Auditing both sites…" })).toBeDisabled();
  await act(async () => rejectNew(new Error("Current request failed")));
  expect(screen.getByRole("alert")).toHaveTextContent("Current request failed");
  expect(screen.getByRole("button", { name: "Compare sites" })).toBeEnabled();
});
