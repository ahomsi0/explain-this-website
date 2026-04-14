import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { URLInput } from "../src/components/UrlInput/UrlInput";

describe("URLInput", () => {
  it("shows validation error for invalid URL", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<URLInput onAnalyze={onAnalyze} isLoading={false} />);

    await user.type(screen.getByLabelText("Website URL to analyze"), "bad-url");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByText("Enter a valid URL, e.g. example.com")).toBeInTheDocument();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("normalizes domain-only input to https", async () => {
    const onAnalyze = vi.fn();
    const user = userEvent.setup();
    render(<URLInput onAnalyze={onAnalyze} isLoading={false} />);

    await user.type(screen.getByLabelText("Website URL to analyze"), "example.com");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(onAnalyze).toHaveBeenCalledWith("https://example.com");
  });
});
