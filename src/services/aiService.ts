import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/httpClient";

export type AiKnowledgeCategory = "Product" | "Lender" | "Underwriting" | "Process";

export type AiDocumentStatus = "Processing" | "Embedded" | "Failed";

export type AiKnowledgeDocument = {
  id: string;
  name: string;
  category: AiKnowledgeCategory;
  isActive: boolean;
  status: AiDocumentStatus;
  uploadStatus?: "Queued" | "Uploaded" | "Failed";
  ocrStatus?: "Pending" | "Processed" | "Failed";
  embeddingStatus?: "Pending" | "Embedded" | "Failed";
  chunkCount: number;
  lastIndexedAt: string | null;
  failureReason?: string | null;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant" | "staff";
  senderName?: string | null;
  content: string;
  createdAt: string;
};

export type AiChatSession = {
  id: string;
  status: "Active" | "Escalated" | "Closed";
  customerName?: string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  typing?: boolean;
  messages?: AiChatMessage[];
};

export type AiIssueReport = {
  id: string;
  status: "Open" | "Resolved";
  pageUrl: string;
  description: string;
  screenshotUrl?: string | null;
  createdAt: string;
  assignedTo?: string | null;
  browserInfo?: string | null;
  chatSessionId?: string | null;
  context?: "client" | "website";
};

export type UploadAiKnowledgePayload = {
  file: File;
  category: AiKnowledgeCategory;
  isActive: boolean;
};

const toArray = <T>(input: unknown): T[] => {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object" && "items" in input) {
    const candidate = (input as { items?: unknown }).items;
    return Array.isArray(candidate) ? (candidate as T[]) : [];
  }
  return [];
};

export const getKnowledgeDocuments = async (): Promise<AiKnowledgeDocument[]> => {
  const response = await apiClient.get<AiKnowledgeDocument[] | { items: AiKnowledgeDocument[] }>("/admin/ai/documents");
  return toArray<AiKnowledgeDocument>(response);
};

export const uploadKnowledgeDocument = async (
  payload: UploadAiKnowledgePayload
): Promise<AiKnowledgeDocument> => {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("category", payload.category);
  formData.append("isActive", String(payload.isActive));
  return apiClient.post<AiKnowledgeDocument>("/admin/ai/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const deleteKnowledgeDocument = async (documentId: string): Promise<void> => {
  await apiClient.delete<void>(`/admin/ai/documents/${documentId}`);
};

export const getChats = async (): Promise<AiChatSession[]> => {
  const response = await apiClient.get<AiChatSession[] | { items: AiChatSession[] }>("/admin/ai/chats");
  return toArray<AiChatSession>(response);
};

export const getChatById = async (chatId: string): Promise<AiChatSession> => {
  return apiClient.get<AiChatSession>(`/admin/ai/chats/${chatId}`);
};

export const sendStaffMessage = async (
  chatId: string,
  payload: { content: string; staffName: string }
): Promise<AiChatMessage> => {
  return apiClient.post<AiChatMessage>(`/admin/ai/chats/${chatId}/messages`, {
    role: "staff",
    senderName: payload.staffName,
    content: payload.content
  });
};

export const closeChat = async (chatId: string): Promise<void> => {
  await apiClient.post<void>(`/admin/ai/chats/${chatId}/close`);
};

export const getIssues = async (): Promise<AiIssueReport[]> => {
  const response = await apiClient.get<AiIssueReport[] | { items: AiIssueReport[] }>("/admin/ai/issues");
  return toArray<AiIssueReport>(response);
};

export const resolveIssue = async (issueId: string): Promise<void> => {
  await apiClient.post<void>(`/admin/ai/issues/${issueId}/resolve`);
};

export const deleteIssue = async (issueId: string): Promise<void> => {
  await apiClient.delete<void>(`/admin/ai/issues/${issueId}`);
};

export const aiQueryKeys = {
  knowledge: ["ai", "knowledge"] as const,
  chats: ["ai", "chats"] as const,
  chat: (chatId: string | null) => ["ai", "chat", chatId] as const,
  issues: ["ai", "issues"] as const
};

export const useAiChatsQuery = () =>
  useQuery({
    queryKey: aiQueryKeys.chats,
    queryFn: getChats
  });

export const useAiChatQuery = (chatId: string | null) =>
  useQuery({
    queryKey: aiQueryKeys.chat(chatId),
    queryFn: () => getChatById(chatId as string),
    enabled: Boolean(chatId)
  });

export const useSendStaffMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content, staffName }: { chatId: string; content: string; staffName: string }) =>
      sendStaffMessage(chatId, { content, staffName }),
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chat(variables.chatId) });
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chats });
    }
  });
};

export const useCloseChatMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => closeChat(chatId),
    onSuccess: (_result, chatId) => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chat(chatId) });
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chats });
    }
  });
};

export const useAiIssuesQuery = () =>
  useQuery({
    queryKey: aiQueryKeys.issues,
    queryFn: getIssues
  });

export const useResolveIssueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => resolveIssue(issueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.issues });
    }
  });
};

export const useDeleteIssueMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => deleteIssue(issueId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.issues });
    }
  });
};

export const AIService = {
  listKnowledge: () => apiClient.get("/ai/knowledge"),
  createKnowledge: (data: unknown) => apiClient.post("/ai/knowledge", data),
  deleteKnowledge: (id: string) => apiClient.delete(`/ai/knowledge/${id}`)
};
