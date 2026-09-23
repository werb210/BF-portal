// BF_PORTAL_SECURE_TOKEN_STORAGE_v422
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("v422 staff tokens are not left in UserDefaults", () => {
  it("uses a real secure-storage plugin, not @capacitor/preferences", () => {
    const store = read("src/lib/secureStore.ts");
    expect(store).toContain("@aparajita/capacitor-secure-storage");
    expect(store).not.toContain("@capacitor/preferences");
  });

  it("fails closed when the Keychain is unavailable", () => {
    const store = read("src/lib/secureStore.ts");
    expect(store).toContain("SecureStoreUnavailable");
    expect(read("src/lib/authToken.ts")).toContain('localStorage.removeItem(STORAGE_KEY)');
  });

  it("mirrors writes and clears on logout", () => {
    const t = read("src/lib/authToken.ts");
    expect(t).toContain("secureSet(STORAGE_KEY, token)");
    expect(t).toContain("secureRemove(STORAGE_KEY)");
  });

  it("hydrates before the app renders", () => {
    const main = read("src/main.tsx");
    expect(main).toContain("hydrateSecureTokens");
    expect(main.indexOf("hydrateSecureTokens")).toBeLessThan(main.indexOf("createRoot("));
  });

  it("is a no-op on web so the browser Portal is unaffected", () => {
    expect(read("src/lib/secureStore.ts")).toContain("if (!isNative()) return");
  });
});
