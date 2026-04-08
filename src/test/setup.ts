import "@testing-library/jest-dom"
import { afterEach } from "vitest"

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// safe StorageEvent polyfill
if (typeof window !== "undefined" && !window.StorageEvent) {
  // @ts-ignore
  window.StorageEvent = class StorageEvent extends Event {}
}
