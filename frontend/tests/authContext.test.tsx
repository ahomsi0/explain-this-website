import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../src/context/AuthContext";
import { useAuth } from "../src/context/useAuth";
import type { AuthUser } from "../src/services/authApi";

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../src/services/authApi", () => authApi);

const user: AuthUser = {
  id: 7,
  email: "tester@example.com",
  createdAt: "2026-08-21T00:00:00Z",
  plan: "free",
  subscriptionStatus: "inactive",
  usage: { plan: "free", dailyLimit: 5, dailyUsed: 0, dailyRemaining: 5 },
  billingEnabled: false,
};

function AuthProbe() {
  const { user: currentUser, login } = useAuth();
  return (
    <>
      <span>{currentUser?.email ?? "signed out"}</span>
      <button type="button" onClick={() => void login(user.email, "password")}>Sign in</button>
    </>
  );
}

describe("AuthProvider", () => {
  it("does not let a stale initial session check undo a completed sign-in", async () => {
    let rejectInitial!: (reason?: unknown) => void;
    const initialRequest = new Promise<AuthUser>((_, reject) => { rejectInitial = reject; });
    authApi.fetchMe.mockReturnValueOnce(initialRequest);
    authApi.login.mockResolvedValueOnce({ user });

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText(user.email)).toBeInTheDocument());

    // Complete the older request after sign-in. Its result must be ignored.
    rejectInitial(new Error("not authenticated"));
    await waitFor(() => expect(screen.getByText(user.email)).toBeInTheDocument());
  });
});
