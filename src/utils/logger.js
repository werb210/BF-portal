const isProduction = import.meta.env.PROD;
const shouldLog = (level) => {
    if (!isProduction)
        return true;
    return level === "error";
};
const write = (level, message, metadata) => {
    if (!shouldLog(level))
        return;
    if (level === "error") {
        console.error(message, metadata ?? {});
        return;
    }
    if (level === "warn") {
        console.warn(message, metadata ?? {});
        return;
    }
    if (level === "debug") {
        console.debug(message, metadata ?? {});
        return;
    }
    console.info(message, metadata ?? {});
};
export const logger = {
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
    error: (message, metadata) => write("error", message, metadata),
    debug: (message, metadata) => write("debug", message, metadata)
};
