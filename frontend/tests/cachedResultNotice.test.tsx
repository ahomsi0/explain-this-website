import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CachedResultNotice } from "../src/components/ResultDashboard/CachedResultNotice";
import { formatCacheAge } from "../src/lib/cacheAge";

describe("formatCacheAge", () => {
  it("reads naturally at every scale", () => {
    expect(formatCacheAge(5)).toBe("moments");
    expect(formatCacheAge(59)).toBe("moments");
    expect(formatCacheAge(60)).toBe("1 minute");
    expect(formatCacheAge(90)).toBe("1 minute");
    expect(formatCacheAge(150)).toBe("2 minutes");
    expect(formatCacheAge(540)).toBe("9 minutes");
  });
});

describe("CachedResultNotice", () => {
  it("renders nothing for a freshly analysed result", () => {
    const { container } = render(<CachedResultNotice ageSeconds={undefined} onRerun={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tells the user how stale the result is", () => {
    render(<CachedResultNotice ageSeconds={180} onRerun={() => {}} />);
    expect(screen.getByText(/cached result from 3 minutes ago/i)).toBeInTheDocument();
  });

  it("re-runs when the user asks for fresh data", async () => {
    const onRerun = vi.fn();
    render(<CachedResultNotice ageSeconds={180} onRerun={onRerun} />);

    await userEvent.click(screen.getByRole("button", { name: /re-run fresh/i }));

    expect(onRerun).toHaveBeenCalledTimes(1);
  });

  it("omits the re-run action when the page cannot re-analyse", () => {
    render(<CachedResultNotice ageSeconds={180} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
