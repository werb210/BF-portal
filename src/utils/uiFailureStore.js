let currentFailure = null;
const listeners = new Set();
export const setUiFailure = (failure) => {
    currentFailure = failure;
    listeners.forEach((listener) => listener(currentFailure));
};
export const clearUiFailure = () => {
    currentFailure = null;
    listeners.forEach((listener) => listener(currentFailure));
};
export const getUiFailure = () => currentFailure;
export const subscribeUiFailure = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
