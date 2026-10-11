// BF_PORTAL_LAZY_RETRY_v784
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import ErrorBoundary from "@/components/system/ErrorBoundary";
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

  it("App uses it for every lazy page, main.tsx handles vite:preloadError, and index.html is not cached", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).not.toMatch(/[^A-Za-z]lazy\(/);
    expect(app).toContain("lazyWithRetry(() => import(\"@/pages/lenders/LendersPage\"))");
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toContain("vite:preloadError");
    expect(main).toContain("reloadOnceForChunkError");
    for (const f of ["staticwebapp.config.json", "public/staticwebapp.config.json"]) {
      const cfg = JSON.parse(readFileSync(f, "utf8"));
      const byRoute = Object.fromEntries(cfg.routes.map((r: { route: string; headers: Record<string, string> }) => [r.route, r.headers["Cache-Control"]]));
      expect(byRoute["/"]).toBe("no-cache, no-store, must-revalidate");
      expect(byRoute["/index.html"]).toBe("no-cache, no-store, must-revalidate");
      expect(byRoute["/assets/*"]).toBe("public, max-age=31536000, immutable");
      expect(cfg.navigationFallback.rewrite).toBe("/index.html");
      expect(cfg.globalHeaders["Content-Security-Policy"]).toContain("default-src 'self'");
      expect(cfg.mimeTypes[".mjs"]).toBe("text/javascript");
    }
  });
});
