export function validateLenderSelection(lenders: string[]) {

  if (!lenders || lenders.length === 0) {
    throw new Error("No lenders selected")
  }

  return true

}
