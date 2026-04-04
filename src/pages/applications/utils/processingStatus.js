const isEmptyTimestamp = (value) => value === null || value === "";
export const getProcessingStatus = ({ ocrCompletedAt, bankingCompletedAt }) => {
    if (ocrCompletedAt === undefined && bankingCompletedAt === undefined) {
        return null;
    }
    if (isEmptyTimestamp(ocrCompletedAt)) {
        return { headerLabel: "Processing: Pending", badge: "Pending" };
    }
    if (isEmptyTimestamp(bankingCompletedAt)) {
        return { headerLabel: "Processing: In progress", badge: "In progress" };
    }
    return { headerLabel: "Processing: Complete", badge: "Complete" };
};
