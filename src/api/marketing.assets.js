let assets = [
    {
        id: "asset-1",
        name: "Primary Logo",
        folder: "Logos",
        type: "image",
        url: "/assets/logo-primary.png",
        uploadedBy: "Alex",
        uploadedAt: new Date().toISOString()
    },
    {
        id: "asset-2",
        name: "Email Template Q2",
        folder: "Templates",
        type: "template",
        url: "/assets/email-template-q2.html",
        uploadedBy: "Brooke",
        uploadedAt: new Date().toISOString()
    }
];
const withDelay = async (data) => new Promise((resolve) => setTimeout(() => resolve(data), 80));
export const fetchAssets = async () => withDelay(assets);
export const uploadAsset = async (payload) => {
    const created = { ...payload, id: `asset-${assets.length + 1}`, uploadedAt: new Date().toISOString() };
    assets = [created, ...assets];
    return withDelay(created);
};
export const deleteAsset = async (id) => {
    assets = assets.filter((asset) => asset.id !== id);
    await withDelay(undefined);
};
