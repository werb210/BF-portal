export function connectSocket() {

  const token = localStorage.getItem("bf_token");

  if (!token) {
    return;
  }

  const socket = new WebSocket(
    `wss://staff.boreal.financial/ws/chat?token=${token}`
  );

  return socket;

}
