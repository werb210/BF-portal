"use strict";
Object.defineProperty(window, "localStorage", {
    value: {
        store: {},
        getItem(key) {
            return this.store[key] || null;
        },
        setItem(key, value) {
            this.store[key] = value;
        },
        removeItem(key) {
            delete this.store[key];
        },
        clear() {
            this.store = {};
        },
    },
    writable: true,
});
