export const getRequestId = () => {
  if (process.env.NODE_ENV === "test") {
    return "72dd093b-4ae3-4b11-9428-8c9bea91a857";
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16;
    const value = char === "x" ? rand : (rand % 4) + 8;
    return Math.floor(value).toString(16);
  });
};
