import { api, type RequestOptions } from "@/api";
import type { MessageRecord } from "@/types/messages.types";

export const fetchMessagesThread = (applicationId: string, options?: RequestOptions) =>
  api.get<MessageRecord[]>(`/communications/messages/thread/${applicationId}`, options);

export const sendMessage = (applicationId: string, body: string) =>
  api.post(`/communications/messages/send`, { applicationId, body });

export const markMessageRead = (messageId: string) =>
  api.patch(`/communications/messages/${messageId}/read`);
