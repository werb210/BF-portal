let state = "idle";
let listeners = [];
export function setCallStatus(next) {
    state = next;
    listeners.forEach((listener) => listener(state));
}
export function getCallStatus() {
    return state;
}
export function subscribeCallStatus(fn) {
    listeners.push(fn);
    return () => {
        listeners = listeners.filter((listener) => listener !== fn);
    };
}
