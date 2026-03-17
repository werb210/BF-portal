export function connectSocket() {

  const token = localStorage.getItem("auth_token");

  if (!token) {
    return;
  }

  const socket = new WebSocket(
    `wss://staff.boreal.financial/ws/chat?token=${token}`
  );

  return socket;

}
