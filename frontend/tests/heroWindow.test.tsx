import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { HeroWindow } from "../src/components/Landing/HeroWindow";

const address = () => screen.getByTestId("hero-window-address").textContent;
const control = (container: HTMLElement, name: string) => container.querySelector<HTMLButtonElement>(`[data-control="${name}"]`)!;
const stateOf = (container: HTMLElement) => container.querySelector(".hero-window")!.getAttribute("data-state");

// Each step schedules the next one from an effect, so every step needs its
// own act() for the following timer to exist.
function steps(count: number, ms: number) {
  for (let i = 0; i < count; i++) act(() => { vi.advanceTimersByTime(ms); });
}

describe("HeroWindow address bar", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("types an example address by itself while the URL field is empty", () => {
    render(<HeroWindow address="" />);
    expect(address()).toBe("");

    steps(4, 70);
    expect(address()).toBe("your");

    steps(9, 70);
    expect(address()).toBe("your-site.com");
  });

  it("erases the example and moves on to the next one", () => {
    render(<HeroWindow address="" />);
    // Type it, hold it, erase it, pause, then start the next.
    steps(13, 70);
    expect(address()).toBe("your-site.com");
    steps(1, 1800);
    steps(13, 35);
    expect(address()).toBe("");
    steps(1, 400);
    steps(3, 70);
    expect(address()).toBe("a-c");
  });

  it("shows the visitor's own text as soon as they type, and stops typing examples", () => {
    const { rerender } = render(<HeroWindow address="" />);
    steps(5, 70);

    rerender(<HeroWindow address="  stripe.com/pricing " />);
    expect(address()).toBe("stripe.com/pricing");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(address()).toBe("stripe.com/pricing");
  });
});

describe("HeroWindow controls", () => {
  it("closes on red and comes back from the reopen link", () => {
    const { container } = render(<HeroWindow address="" />);
    expect(stateOf(container)).toBe("open");

    fireEvent.click(control(container, "close"));
    expect(stateOf(container)).toBe("closed");
    expect(control(container, "close")).toBeNull();

    fireEvent.click(screen.getByText("Reopen window"));
    expect(stateOf(container)).toBe("open");
    expect(control(container, "close")).not.toBeNull();
  });

  it("minimizes on yellow, and yellow again restores it", () => {
    const { container } = render(<HeroWindow address="" />);
    fireEvent.click(control(container, "minimize"));
    expect(stateOf(container)).toBe("minimized");
    expect(container.querySelectorAll(".hero-window-line")).toHaveLength(0);

    fireEvent.click(control(container, "minimize"));
    expect(stateOf(container)).toBe("open");
    expect(container.querySelectorAll(".hero-window-line").length).toBeGreaterThan(0);
  });

  it("fills the page on green, and green again restores it", () => {
    const { container } = render(<HeroWindow address="" />);
    fireEvent.click(control(container, "zoom"));
    expect(stateOf(container)).toBe("full");
    fireEvent.click(control(container, "zoom"));
    expect(stateOf(container)).toBe("open");
  });

  it("is decoration: hidden from assistive tech and out of the tab order", () => {
    const { container } = render(<HeroWindow address="example.com" />);
    for (const layer of Array.from(container.children)) {
      expect(layer).toHaveAttribute("aria-hidden", "true");
    }
    for (const button of Array.from(container.querySelectorAll("button"))) {
      expect(button).toHaveAttribute("tabindex", "-1");
    }
  });
});
