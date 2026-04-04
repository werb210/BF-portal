export function validateLenderSelection(lenders) {
    if (!lenders || lenders.length === 0) {
        throw new Error("No lenders selected");
    }
    return true;
}
