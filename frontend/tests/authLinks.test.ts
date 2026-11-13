import { beforeEach, describe, expect, it } from "vitest";
import { authHref, nextFromLocation, safeNext } from "../src/lib/authLinks";

describe("safeNext", () => {
  it("keeps paths on this site, including their query", () => {
    expect(safeNext("/compare")).toBe("/compare");
    expect(safeNext("/?url=https%3A%2F%2Fexample.com")).toBe("/?url=https%3A%2F%2Fexample.com");
    expect(safeNext(`/report/${"a".repeat(32)}`)).toBe(`/report/${"a".repeat(32)}`);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example/phish",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    null,
    undefined,
  ])("falls back to the homepage for %s", (raw) => {
    expect(safeNext(raw)).toBe("/");
  });

  it("never returns to an auth page, which would loop", () => {
    expect(safeNext("/login")).toBe("/");
    expect(safeNext("/signup?next=%2Fcompare")).toBe("/");
  });
});

describe("authHref", () => {
  beforeEach(() => window.history.replaceState({}, "", "/"));

  it("links plainly from the homepage and carries any other page as next", () => {
    expect(authHref("login")).toBe("/login");
    window.history.replaceState({}, "", "/compare");
    expect(authHref("login")).toBe("/login?next=%2Fcompare");
    expect(authHref("signup")).toBe("/signup?next=%2Fcompare");
  });

  it("passes an explicit target through, and reads it back on the auth page", () => {
    const href = authHref("login", "/?url=https%3A%2F%2Fexample.com");
    expect(href).toBe("/login?next=%2F%3Furl%3Dhttps%253A%252F%252Fexample.com");
    window.history.replaceState({}, "", href);
    expect(nextFromLocation()).toBe("/?url=https%3A%2F%2Fexample.com");
  });
});
