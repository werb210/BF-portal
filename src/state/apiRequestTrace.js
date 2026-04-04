let lastRequest = null;
export const setLastApiRequest = (trace) => {
    lastRequest = trace;
};
export const getLastApiRequest = () => lastRequest;
export const clearLastApiRequest = () => {
    lastRequest = null;
};
