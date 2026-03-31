import { describe, expect, it, vi } from "vitest"
import { isOnline, requireOnline } from "@/lib/networkGuard"

describe("network guard", () => {
  it("returns true when navigator is unavailable", () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator")

    vi.stubGlobal("navigator", undefined)
    expect(isOnline()).toBe(true)

    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor)
    }
  })

  it("throws OFFLINE when navigator reports offline", () => {
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator")

    vi.stubGlobal("navigator", { onLine: false })
    expect(() => requireOnline()).toThrow("OFFLINE")

    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor)
    }
  })
})
