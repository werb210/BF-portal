"use strict";
const storage = new Map();
Object.defineProperty(window, "localStorage", {
    value: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
            storage.set(key, value);
        },
        removeItem: (key) => {
            storage.delete(key);
        },
        clear: () => {
            storage.clear();
        },
    },
    writable: true,
});
