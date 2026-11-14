import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { HeroWindow } from "../src/components/Landing/HeroWindow";
import { nearestBox, type Box } from "../src/lib/nearestRect";

const box = (left: number, top: number, width: number, height = 1): Box => ({ left, top, right: left + width, bottom: top + height });

describe("nearestBox", () => {
  const lines = [box(100, 100, 120), box(100, 130, 80), box(1000, 100, 120)];

  it("picks the line the point is closest to", () => {
    expect(nearestBox(lines, 150, 104, 150)).toBe(0);
    expect(nearestBox(lines, 150, 128, 150)).toBe(1);
    expect(nearestBox(lines, 1090, 90, 150)).toBe(2);
  });

  it("treats a point beside a line as close as one above its middle", () => {
    // 30px to the right of the first line's end, level with it.
    expect(nearestBox([lines[0]], 250, 100, 40)).toBe(0);
  });

  it("returns -1 when nothing is within reach", () => {
    expect(nearestBox(lines, 600, 400, 150)).toBe(-1);
  });

  it("ignores hidden lines, which have no width", () => {
    expect(nearestBox([box(100, 100, 0), null], 100, 100, 150)).toBe(-1);
  });
});

describe("HeroWindow", () => {
  it("shows the typed address in its address bar", () => {
    const { rerender } = render(<HeroWindow address="" />);
    expect(screen.getByTestId("hero-window-address")).toHaveTextContent("");

    rerender(<HeroWindow address="  stripe.com/pricing " />);
    expect(screen.getByTestId("hero-window-address")).toHaveTextContent("stripe.com/pricing");
  });

  it("is hidden from assistive tech and never takes a click", () => {
    const { container } = render(<HeroWindow address="example.com" />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("pointer-events-none");
  });

  it("runs one scan when typing starts, and another only after the field is cleared", () => {
    const { container, rerender } = render(<HeroWindow address="" />);
    const scans = () => container.querySelectorAll(".hero-window-scan").length;
    expect(scans()).toBe(0);

    act(() => rerender(<HeroWindow address="s" />));
    expect(scans()).toBe(1);
    const first = container.querySelector(".hero-window-scan");

    act(() => rerender(<HeroWindow address="stripe.com" />));
    expect(container.querySelector(".hero-window-scan")).toBe(first);

    act(() => rerender(<HeroWindow address="" />));
    act(() => rerender(<HeroWindow address="a" />));
    expect(container.querySelector(".hero-window-scan")).not.toBe(first);
  });

  it("names the parts of a page the analyzer reads", () => {
    render(<HeroWindow address="" />);
    for (const label of ["Title", "Meta description", "Headings", "Links", "Call to action", "Tech stack", "Scripts", "Images", "Security headers"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
