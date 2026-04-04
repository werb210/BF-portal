const handlers = new Set();
export const registerAuthFailureHandler = (next) => {
    handlers.add(next);
    return () => {
        handlers.delete(next);
    };
};
export const reportAuthFailure = (reason) => {
    handlers.forEach((handler) => handler(reason));
};
