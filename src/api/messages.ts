import { apiClient, type RequestOptions } from "./httpClient";
import type { MessageRecord } from "@/types/messages.types";

export const fetchMessagesThread = (applicationId: string, options?: RequestOptions) =>
  apiClient.get<MessageRecord[]>(`/communications/messages/thread/${applicationId}`, options);

export const sendMessage = (applicationId: string, body: string) =>
  apiClient.post(`/communications/messages/send`, { applicationId, body });

export const markMessageRead = (messageId: string) =>
  apiClient.patch(`/communications/messages/${messageId}/read`);
