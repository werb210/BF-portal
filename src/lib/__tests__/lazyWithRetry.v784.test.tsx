// BF_PORTAL_LAZY_RETRY_v784
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import rootConfig from "../../../staticwebapp.config.json";
import publicConfig from "../../../public/staticwebapp.config.json";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import ErrorBoundary from "@/components/system/ErrorBoundary";

const h = vi.hoisted(() => ({ lendersLoaded: false }));
// Count every React.lazy() call and every lazyWithRetry() call, so App's pages can be checked.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, lazy: vi.fn(actual.lazy) };
});
vi.mock("@/lib/lazyWithRetry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lazyWithRetry")>();
  const spy = vi.fn(actual.lazyWithRetry);
  return { ...actual, lazyWithRetry: spy, default: spy };
});
vi.mock("@/pages/lenders/LendersPage", () => {
  h.lendersLoaded = true;
  return { default: () => null };
});
import {
  CHUNK_RELOAD_KEY,
  isChunkLoadError,
  lazyWithRetry,
  reloadOnceForChunkError,
} from "@/lib/lazyWithRetry";

const chunkError = () => new TypeError("Failed to fetch dynamically imported module: https://x/assets/LendersPage-abc.js");

describe("lazyWithRetry", () => {
  let reload: ReturnType<typeof vi.fn>;
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...originalLocation, reload } });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it("recognises the chunk-load error messages", () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error("Loading chunk 3 failed"), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });

  it("reloads once, then refuses to reload again within 30s", () => {
    expect(reloadOnceForChunkError(1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("1000000");
    expect(reloadOnceForChunkError(1_000_000 + 10_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadOnceForChunkError(1_000_000 + 31_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("a stale chunk reloads the page once and does not loop", async () => {
    const factory = vi.fn(() => Promise.reject(chunkError()));
    const Page = lazyWithRetry(factory);
    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    );
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("The portal was updated")).toBeNull();
  });

  it("after a recent reload, the error reaches the ErrorBoundary with a Reload button", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    const Page = lazyWithRetry(() => Promise.reject(chunkError()));
    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByText("The portal was updated")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    screen.getByRole("button", { name: "Reload" }).click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("other import errors are rethrown without reloading", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Page = lazyWithRetry(() => Promise.reject(new Error("boom")));
    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading</div>}>
          <Page />
        </Suspense>
      </ErrorBoundary>,
    );
    expect(await screen.findByText("Something went wrong on this screen")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("App loads every page through lazyWithRetry, on demand", async () => {
    const react = await import("react");
    const lazySpy = vi.mocked(react.lazy);
    const retrySpy = vi.mocked(lazyWithRetry);
    lazySpy.mockClear();
    retrySpy.mockClear();
    await import("@/App");
    expect(retrySpy.mock.calls.length).toBeGreaterThan(30);
    // Every React.lazy() made while loading the App came from lazyWithRetry - none bypass the retry.
    expect(lazySpy.mock.calls.length).toBe(retrySpy.mock.calls.length);
    // LendersPage (the page in the original stale-chunk report) is not in the main bundle.
    expect(h.lendersLoaded).toBe(false);
  });

  // Dropped: "main.tsx handles vite:preloadError with reloadOnceForChunkError". main.tsx renders the app as a
  // top-level side effect and cannot be imported in a test; reloadOnceForChunkError itself is tested above.
  it("index.html is never cached, hashed assets are, in both static web app configs", () => {
    for (const cfg of [rootConfig, publicConfig]) {
      const byRoute = Object.fromEntries(cfg.routes.map((r: { route: string; headers?: Record<string, string> }) => [r.route, r.headers?.["Cache-Control"]]));
      expect(byRoute["/"]).toBe("no-cache, no-store, must-revalidate");
      expect(byRoute["/index.html"]).toBe("no-cache, no-store, must-revalidate");
      expect(byRoute["/assets/*"]).toBe("public, max-age=31536000, immutable");
      expect(cfg.navigationFallback.rewrite).toBe("/index.html");
      expect(cfg.globalHeaders["Content-Security-Policy"]).toContain("default-src 'self'");
      expect((cfg.mimeTypes as Record<string, string>)[".mjs"]).toBe("text/javascript");
    }
  });
});
