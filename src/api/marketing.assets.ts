export type BrandAsset = {
  id: string;
  name: string;
  folder: "Logos" | "Colors" | "Templates" | "Video" | "Images";
  type: "image" | "video" | "template";
  url: string;
  uploadedBy: string;
  uploadedAt: string;
};

let assets: BrandAsset[] = [
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

const withDelay = async <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 80));

export const fetchAssets = async (): Promise<BrandAsset[]> => withDelay(assets);

export const uploadAsset = async (payload: Omit<BrandAsset, "id" | "uploadedAt">): Promise<BrandAsset> => {
  const created: BrandAsset = { ...payload, id: `asset-${assets.length + 1}`, uploadedAt: new Date().toISOString() };
  assets = [created, ...assets];
  return withDelay(created);
};

export const deleteAsset = async (id: string): Promise<void> => {
  assets = assets.filter((asset) => asset.id !== id);
  await withDelay(undefined);
};
