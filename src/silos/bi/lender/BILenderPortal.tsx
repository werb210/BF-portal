import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api";
import ActivityTimeline from "../components/ActivityTimeline";

type Application = {
  id: string;
  primary_contact_name?: string;
  stage?: string;
  premium_calc?: {
    annualPremium?: number;
  };
};

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg"
]);
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export default function BILenderPortal() {
  const [apps, setApps] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await apiClient<Application[]>("/api/bi/lender/applications");
    setApps(data);
  }

  async function uploadDocs(appId: string, files: FileList | null) {
    if (!files) return;

    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      if (!ALLOWED_FILE_TYPES.has(file.type)) {
        toast.error("Invalid file type. Allowed: PDF, DOCX, XLSX, PNG, JPG.");
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        toast.error("File is too large. Max size is 25 MB.");
        return;
      }
      formData.append("files", file);
    }

    await apiClient(`/api/bi/application/${appId}/documents`, {
      method: "POST",
      body: formData
    });

    toast.success("Documents uploaded");
    void load();
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="text-3xl font-semibold mb-6">Lender Applications</h2>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-brand-surface border border-card rounded-xl p-4"
              onClick={() => setSelected(app)}
              style={{ cursor: "pointer" }}
            >
              <strong>{app.primary_contact_name || "Applicant"}</strong>
              <p>Stage: {app.stage || "-"}</p>
              <p>Premium: ${app.premium_calc?.annualPremium?.toLocaleString() || "-"}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3 bg-brand-bgAlt border border-card rounded-xl p-6">
          {selected && (
            <>
              <h3 className="text-xl font-semibold">Application Detail</h3>

              <p>Stage: {selected.stage || "-"}</p>
              <p>Premium: ${selected.premium_calc?.annualPremium?.toLocaleString() || "-"}</p>

              <h4 className="mt-4 mb-2">Upload Additional Documents</h4>
              <input type="file" multiple onChange={(e) => void uploadDocs(selected.id, e.target.files)} />

              <div className="mt-6">
                <ActivityTimeline applicationId={selected.id} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
