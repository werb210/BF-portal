import { create } from "zustand";
import { acknowledgeIssue, createHumanEscalation, createIssueReport, fetchCommunicationThreads, receiveInboundMessage, sendCommunication } from "@/api/communications";
const matchesSearch = (conversation, search) => {
    if (!search)
        return true;
    const needle = search.toLowerCase();
    return (conversation.contactName?.toLowerCase().includes(needle) ||
        conversation.applicationId?.toLowerCase().includes(needle) ||
        conversation.applicationName?.toLowerCase().includes(needle));
};
export const useCommunicationsStore = create((set, get) => ({
    conversations: [],
    selectedConversationId: undefined,
    loading: false,
    filters: { channel: "all", silo: "all", assigned: "all", search: "" },
    setConversations: (conversations) => set({ conversations, selectedConversationId: conversations[0]?.id, loading: false }),
    selectConversation: (conversationId) => set({ selectedConversationId: conversationId }),
    addMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map((conv) => conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, message], updatedAt: message.createdAt, unread: 0 }
            : conv)
    })),
    setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    filteredConversations: () => {
        const { conversations, filters } = get();
        return conversations.filter((conversation) => {
            if (filters.channel !== "all" && conversation.type !== filters.channel)
                return false;
            if (filters.silo !== "all" && conversation.silo !== filters.silo)
                return false;
            if (filters.assigned !== "all" && conversation.assignedTo !== filters.assigned)
                return false;
            if (!matchesSearch(conversation, filters.search))
                return false;
            return true;
        });
    },
    loadConversations: async () => {
        set({ loading: true });
        const threads = await fetchCommunicationThreads();
        set({ conversations: threads, loading: false, selectedConversationId: threads[0]?.id });
    },
    sendReply: async (conversationId, body, channel) => {
        const message = await sendCommunication(conversationId, body, channel);
        get().addMessage(conversationId, message);
        return message;
    },
    escalateToHuman: async (payload) => {
        const conversation = await createHumanEscalation(payload);
        set((state) => ({ conversations: [conversation, ...state.conversations], selectedConversationId: conversation.id }));
        return conversation;
    },
    reportIssue: async (payload) => {
        const conversation = await createIssueReport(payload);
        set((state) => ({ conversations: [conversation, ...state.conversations], selectedConversationId: conversation.id }));
        return conversation;
    },
    acknowledgeIssue: async (conversationId) => {
        const updated = await acknowledgeIssue(conversationId);
        set((state) => ({
            conversations: state.conversations.map((conv) => (conv.id === conversationId ? updated : conv)),
            selectedConversationId: updated.id
        }));
    },
    receiveSms: async (conversationId, body) => {
        const message = await receiveInboundMessage(conversationId, body, "sms", "BF");
        get().addMessage(conversationId, message);
        return message;
    }
}));
