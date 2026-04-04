const emailMessages = [
    {
        id: "m1",
        contactId: "c1",
        subject: "Welcome to Boreal",
        folder: "inbox",
        from: "jane@example.com",
        to: "agent@boreal.com",
        body: "<p>Hello agent, thanks for reaching out.</p>",
        attachments: ["contract.pdf"]
    },
    {
        id: "m2",
        contactId: "c1",
        subject: "Sent docs",
        folder: "sent",
        from: "agent@boreal.com",
        to: "jane@example.com",
        body: "<p>Here are the documents.</p>",
        attachments: []
    }
];
export const fetchEmailMessages = async (contactId, folder, query) => new Promise((resolve) => setTimeout(() => {
    const filtered = emailMessages.filter((message) => message.contactId === contactId);
    const byFolder = folder ? filtered.filter((message) => message.folder === folder) : filtered;
    const byQuery = query
        ? byFolder.filter((message) => message.subject.toLowerCase().includes(query.toLowerCase()) ||
            message.body.toLowerCase().includes(query.toLowerCase()))
        : byFolder;
    resolve(byQuery);
}, 10));
export const fetchEmailMessage = async (messageId) => new Promise((resolve) => setTimeout(() => resolve(emailMessages.find((message) => message.id === messageId)), 10));
