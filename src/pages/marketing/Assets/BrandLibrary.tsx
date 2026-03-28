import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import AppLoading from "@/components/layout/AppLoading";
import type { BrandAsset } from "@/api/marketing.assets";
import UploadAssetModal from "./UploadAssetModal";

interface Props {
  assets?: BrandAsset[];
}

const BrandLibrary = ({ assets }: Props) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Card title="Brand Asset Library" actions={<Button onClick={() => setModalOpen(true)}>Upload</Button>}>
      {!assets && <AppLoading />}
      {assets && (
        <Table headers={["Name", "Folder", "Type", "Uploaded by", "Actions"]}>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.name}</td>
              <td>{asset.folder}</td>
              <td className="capitalize">{asset.type}</td>
              <td>{asset.uploadedBy}</td>
              <td>
                <a className="ui-button ui-button--ghost" href={asset.url} download>
                  Download
                </a>
              </td>
            </tr>
          ))}
          {!assets.length && (
            <tr>
              <td colSpan={5}>No assets uploaded.</td>
            </tr>
          )}
        </Table>
      )}
      {modalOpen && <UploadAssetModal onClose={() => setModalOpen(false)} />}
    </Card>
  );
};

export default BrandLibrary;
