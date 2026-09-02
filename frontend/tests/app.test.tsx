import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const authApi = vi.hoisted(() => ({
  fetchMe: vi.fn(() => new Promise<never>(() => {})),
  fetchUsage: vi.fn(() => new Promise<never>(() => {})),
}));

vi.mock("../src/services/authApi", async (importOriginal) => ({
  ...(await importOriginal()),
  ...authApi,
}));

import App from "../src/App";

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders the landing page while session restoration is pending", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Understand any website\s*in seconds\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
