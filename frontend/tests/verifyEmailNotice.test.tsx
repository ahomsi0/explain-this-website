import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: null as null | { email: string; emailVerifiedAt?: string } }));
vi.mock("../src/context/useAuth", () => ({ useAuth: () => ({ user: auth.user }) }));

const api = vi.hoisted(() => ({ resendVerification: vi.fn() }));
vi.mock("../src/services/authApi", () => ({ resendVerification: api.resendVerification }));

import { VerifyEmailNotice } from "../src/components/auth/VerifyEmailNotice";

describe("VerifyEmailNotice", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.resendVerification.mockReset();
    auth.user = { email: "new@example.com" };
  });

  it("stays out of the way for signed-out visitors and verified accounts", () => {
    auth.user = null;
    const { container, rerender } = render(<VerifyEmailNotice />);
    expect(container).toBeEmptyDOMElement();

    auth.user = { email: "done@example.com", emailVerifiedAt: "2026-11-13T00:00:00Z" };
    rerender(<VerifyEmailNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the address and confirms when a new link is sent", async () => {
    api.resendVerification.mockResolvedValueOnce({ status: "sent" });
    render(<VerifyEmailNotice />);

    expect(screen.getByRole("status")).toHaveTextContent("new@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));

    expect(await screen.findByText("Sent. Check your inbox.")).toBeInTheDocument();
    expect(api.resendVerification).toHaveBeenCalledTimes(1);
  });

  it("shows the server's reason when the email cannot be sent, and allows another try", async () => {
    api.resendVerification.mockRejectedValueOnce(
      new Error("We sent a link a moment ago. Please wait a minute before asking for another."),
    );
    render(<VerifyEmailNotice />);

    fireEvent.click(screen.getByRole("button", { name: "Send a new link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait a minute");
    expect(screen.getByRole("button", { name: "Send a new link" })).toBeEnabled();
  });

  it("can be dismissed for the rest of the session", () => {
    const { container, unmount } = render(<VerifyEmailNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(container).toBeEmptyDOMElement();

    // A later page load in the same session stays quiet too.
    unmount();
    const again = render(<VerifyEmailNotice />);
    expect(again.container).toBeEmptyDOMElement();
  });
});
