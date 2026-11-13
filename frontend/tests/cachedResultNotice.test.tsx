import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CachedResultNotice } from "../src/components/ResultDashboard/CachedResultNotice";
import { currentCacheAge, formatCacheAge } from "../src/lib/cacheAge";

describe("formatCacheAge", () => {
  it("reads naturally at every scale", () => {
    expect(formatCacheAge(5)).toBe("moments");
    expect(formatCacheAge(59)).toBe("moments");
    expect(formatCacheAge(60)).toBe("1 minute");
    expect(formatCacheAge(90)).toBe("1 minute");
    expect(formatCacheAge(150)).toBe("2 minutes");
    expect(formatCacheAge(540)).toBe("9 minutes");
    expect(formatCacheAge(59 * 60)).toBe("59 minutes");
    expect(formatCacheAge(60 * 60)).toBe("1 hour");
    expect(formatCacheAge(150 * 60)).toBe("2 hours");
  });
});

describe("currentCacheAge", () => {
  it("adds the time the report has been open to the age the API reported", () => {
    const receivedAt = 1_000_000;
    expect(currentCacheAge(540, receivedAt, receivedAt)).toBe(540);
    expect(currentCacheAge(540, receivedAt, receivedAt + 15 * 60_000)).toBe(540 + 900);
  });

  it("never goes below the reported age if the clock moves backwards", () => {
    expect(currentCacheAge(540, 1_000_000, 900_000)).toBe(540);
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

  describe("while the report stays open", () => {
    afterEach(() => { vi.useRealTimers(); });

    it("keeps counting, so a 9 minute old result reads 24 minutes a quarter of an hour later", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));

      render(<CachedResultNotice ageSeconds={9 * 60} receivedAt={Date.now()} />);
      expect(screen.getByText(/cached result from 9 minutes ago/i)).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(15 * 60_000); });
      expect(screen.getByText(/cached result from 24 minutes ago/i)).toBeInTheDocument();
    });

    it("counts from when the result arrived, not from when the notice appeared", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
      const receivedAt = Date.now() - 6 * 60_000;

      render(<CachedResultNotice ageSeconds={9 * 60} receivedAt={receivedAt} />);

      expect(screen.getByText(/cached result from 15 minutes ago/i)).toBeInTheDocument();
    });
  });
});
