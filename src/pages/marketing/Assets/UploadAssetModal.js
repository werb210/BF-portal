import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAsset, deleteAsset } from "@/api/marketing.assets";
const UploadAssetModal = ({ onClose }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [folder, setFolder] = useState("Logos");
    const [type, setType] = useState("image");
    const [url, setUrl] = useState("");
    const uploadMutation = useMutation({
        mutationFn: () => uploadAsset({ name, folder: folder, type: type, url, uploadedBy: "You" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            onClose();
        }
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteAsset(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] })
    });
    return (_jsx("div", { className: "drawer", children: _jsx(Card, { title: "Upload asset", actions: _jsx(Button, { onClick: onClose, children: "Close" }), children: _jsxs("div", { className: "grid gap-3", children: [_jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Name" }), _jsx("input", { className: "input", value: name, onChange: (e) => setName(e.target.value) })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Folder" }), _jsxs("select", { className: "input", value: folder, onChange: (e) => setFolder(e.target.value), children: [_jsx("option", { children: "Logos" }), _jsx("option", { children: "Colors" }), _jsx("option", { children: "Templates" }), _jsx("option", { children: "Video" }), _jsx("option", { children: "Images" })] })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "Type" }), _jsxs("select", { className: "input", value: type, onChange: (e) => setType(e.target.value), children: [_jsx("option", { value: "image", children: "Image" }), _jsx("option", { value: "video", children: "Video" }), _jsx("option", { value: "template", children: "Template" })] })] }), _jsxs("label", { className: "grid gap-1", children: [_jsx("span", { className: "text-muted", children: "URL" }), _jsx("input", { className: "input", value: url, onChange: (e) => setUrl(e.target.value) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { disabled: uploadMutation.isPending, onClick: () => uploadMutation.mutate(), children: "Upload" }), _jsx(Button, { variant: "ghost", onClick: () => deleteMutation.mutate("asset-1"), children: "Delete sample" })] })] }) }) }));
};
export default UploadAssetModal;
