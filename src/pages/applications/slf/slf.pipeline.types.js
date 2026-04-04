export const SLF_PIPELINE_STAGES = [
    { id: "received", label: "Received", description: "Newly submitted applications" },
    { id: "lender-review", label: "Lender Review", description: "Under lender evaluation" },
    { id: "term-sheet", label: "Term Sheet", description: "Term sheet issued" },
    { id: "accepted", label: "Accepted", description: "Client accepted terms" },
    { id: "rejected", label: "Rejected", description: "Application rejected", terminal: true }
];
