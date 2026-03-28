import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAsset, deleteAsset } from "@/api/marketing.assets";

interface Props {
  onClose: () => void;
}

const UploadAssetModal = ({ onClose }: Props) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("Logos");
  const [type, setType] = useState("image");
  const [url, setUrl] = useState("");

  const uploadMutation = useMutation({
    mutationFn: () => uploadAsset({ name, folder: folder as any, type: type as any, url, uploadedBy: "You" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] })
  });

  return (
    <div className="drawer">
      <Card title="Upload asset" actions={<Button onClick={onClose}>Close</Button>}>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-muted">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Folder</span>
            <select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option>Logos</option>
              <option>Colors</option>
              <option>Templates</option>
              <option>Video</option>
              <option>Images</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted">Type</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="template">Template</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-muted">URL</span>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>Upload</Button>
            <Button variant="ghost" onClick={() => deleteMutation.mutate("asset-1")}>Delete sample</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UploadAssetModal;
