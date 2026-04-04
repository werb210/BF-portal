import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api";
const toArray = (input) => {
    if (Array.isArray(input))
        return input;
    if (input && typeof input === "object" && "items" in input) {
        const candidate = input.items;
        return Array.isArray(candidate) ? candidate : [];
    }
    return [];
};
export const getKnowledgeDocuments = async () => {
    const response = await api.get("/api/admin/ai/documents");
    return toArray(response);
};
export const uploadKnowledgeDocument = async (payload) => {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("category", payload.category);
    formData.append("isActive", String(payload.isActive));
    return api.post("/api/admin/ai/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};
export const deleteKnowledgeDocument = async (documentId) => {
    await api.delete(`/admin/ai/documents/${documentId}`);
};
export const getChats = async () => {
    const response = await api.get("/api/admin/ai/chats");
    return toArray(response);
};
export const getChatById = async (chatId) => {
    return api.get(`/admin/ai/chats/${chatId}`);
};
export const sendStaffMessage = async (chatId, payload) => {
    return api.post(`/admin/ai/chats/${chatId}/messages`, {
        role: "staff",
        senderName: payload.staffName,
        content: payload.content
    });
};
export const closeChat = async (chatId) => {
    await api.post(`/admin/ai/chats/${chatId}/close`);
};
export const getIssues = async () => {
    const response = await api.get("/api/admin/ai/issues");
    return toArray(response);
};
export const resolveIssue = async (issueId) => {
    await api.post(`/admin/ai/issues/${issueId}/resolve`);
};
export const deleteIssue = async (issueId) => {
    await api.delete(`/admin/ai/issues/${issueId}`);
};
export const aiQueryKeys = {
    knowledge: ["ai", "knowledge"],
    chats: ["ai", "chats"],
    chat: (chatId) => ["ai", "chat", chatId],
    issues: ["ai", "issues"]
};
export const useAiChatsQuery = () => useQuery({
    queryKey: aiQueryKeys.chats,
    queryFn: getChats
});
export const useAiChatQuery = (chatId) => useQuery({
    queryKey: aiQueryKeys.chat(chatId),
    queryFn: () => getChatById(chatId),
    enabled: Boolean(chatId)
});
export const useSendStaffMessageMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ chatId, content, staffName }) => sendStaffMessage(chatId, { content, staffName }),
        onSuccess: (_message, variables) => {
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chat(variables.chatId) });
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chats });
        }
    });
};
export const useCloseChatMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (chatId) => closeChat(chatId),
        onSuccess: (_result, chatId) => {
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chat(chatId) });
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.chats });
        }
    });
};
export const useAiIssuesQuery = () => useQuery({
    queryKey: aiQueryKeys.issues,
    queryFn: getIssues
});
export const useResolveIssueMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (issueId) => resolveIssue(issueId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.issues });
        }
    });
};
export const useDeleteIssueMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (issueId) => deleteIssue(issueId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: aiQueryKeys.issues });
        }
    });
};
export const AIService = {
    listKnowledge: () => api.get("/api/ai/knowledge"),
    createKnowledge: (data) => api.post("/api/ai/knowledge", data),
    deleteKnowledge: (id) => api.delete(`/ai/knowledge/${id}`)
};
