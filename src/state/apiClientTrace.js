let lastApiRequest = null;
export const setLastApiRequest = (trace) => {
    lastApiRequest = trace;
};
export const getLastApiRequest = () => lastApiRequest;
export const clearLastApiRequest = () => {
    lastApiRequest = null;
};
