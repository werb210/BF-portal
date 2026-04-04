import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import UploadAssetModal from "./UploadAssetModal";
const BrandLibrary = ({ assets }) => {
    const [modalOpen, setModalOpen] = useState(false);
    return (_jsxs(Card, { title: "Brand Asset Library", actions: _jsx(Button, { onClick: () => setModalOpen(true), children: "Upload" }), children: [!assets && _jsx(AppLoading, {}), assets && (_jsxs(Table, { headers: ["Name", "Folder", "Type", "Uploaded by", "Actions"], children: [assets.map((asset) => (_jsxs("tr", { children: [_jsx("td", { children: asset.name }), _jsx("td", { children: asset.folder }), _jsx("td", { className: "capitalize", children: asset.type }), _jsx("td", { children: asset.uploadedBy }), _jsx("td", { children: _jsx("a", { className: "ui-button ui-button--ghost", href: asset.url, download: true, children: "Download" }) })] }, asset.id))), !assets.length && (_jsx("tr", { children: _jsx("td", { colSpan: 5, children: "No assets uploaded." }) }))] })), modalOpen && _jsx(UploadAssetModal, { onClose: () => setModalOpen(false) })] }));
};
export default BrandLibrary;
