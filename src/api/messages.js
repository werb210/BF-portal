import { api } from "@/api";
export const fetchMessagesThread = (applicationId, options) => api.get(`/communications/messages/thread/${applicationId}`, options);
export const sendMessage = (applicationId, body) => api.post(`/communications/messages/send`, { applicationId, body });
export const markMessageRead = (messageId) => api.patch(`/communications/messages/${messageId}/read`);
