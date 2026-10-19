import "@testing-library/jest-dom/vitest";

// Node 22+ defines an experimental global `localStorage` that is `undefined`
// unless --localstorage-file is passed, and it shadows jsdom's. Give tests a
// working in-memory Storage so app code that persists state can run.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => { store.delete(key); },
    setItem: (key, value) => { store.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true, writable: true });
}
