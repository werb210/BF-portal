export function validateLenderSelection(lenders) {
    if (!Array.isArray(lenders)) {
        throw new Error("Invalid lender list");
    }
    if (lenders.length === 0) {
        throw new Error("No lenders selected");
    }
    return true;
}
