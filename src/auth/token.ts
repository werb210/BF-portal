export const getToken = () => {
  return localStorage.getItem("token") || "";
};

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const clearToken = () => {
  localStorage.removeItem("token");
};
