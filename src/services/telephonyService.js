export async function getCallStatus() {
    // Non-MVP endpoint removed from BF-server contract.
    return {
        status: "offline",
        activeCall: false
    };
}
