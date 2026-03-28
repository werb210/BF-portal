export const requireAuth = () => {
  const token = sessionStorage.getItem("auth_token");

  if (!token) {
    throw new Error("User not authenticated");
  }

  return token;
};
