export function assertObject(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("INVALID_RESPONSE_SHAPE");
  }
}
