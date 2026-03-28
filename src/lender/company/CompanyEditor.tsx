import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { fetchLenderCompany, updateLenderCompany, uploadLenderLogo, type LenderCompany } from "@/api/lender/company";

const requiredFields: (keyof LenderCompany)[] = ["companyName", "supportEmail", "supportPhone"];

const CompanyEditor = () => {
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ["lender", "company"], queryFn: fetchLenderCompany });
  const [formState, setFormState] = useState<LenderCompany | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const updateMutation = useMutation({
    mutationFn: updateLenderCompany,
    onSuccess: (next) => {
      setFormState(next);
      queryClient.setQueryData(["lender", "company"], next);
    }
  });

  useEffect(() => {
    if (company) {
      setFormState(company);
    }
  }, [company]);

  const isValid = useMemo(() => requiredFields.every((field) => formState?.[field]), [formState]);

  const handleChange = (field: keyof LenderCompany | `address.${keyof NonNullable<LenderCompany["address"]>}`) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!formState) return;
      const value = event.target.value;
      if (field.startsWith("address.")) {
        const addressField = field.split(".")[1] as keyof NonNullable<LenderCompany["address"]>;
        setFormState({ ...formState, address: { ...formState.address, [addressField]: value } });
        return;
      }
      setFormState({ ...formState, [field]: value });
    };

  const handleLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !formState) return;
    const response = await uploadLenderLogo(file);
    setFormState({ ...formState, logoUrl: response.url });
  };

  const handleSave = async () => {
    if (!formState) return;
    const nextErrors: Record<string, string> = {};
    requiredFields.forEach((field) => {
      if (!formState[field]) {
        nextErrors[field] = "Required";
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await updateMutation.mutateAsync(formState);
  };

  const handleCancel = () => {
    if (company) setFormState(company);
  };

  if (isLoading || !formState) {
    return (
      <div className="lender-section">
        <div className="lender-section__title">Loading company profile...</div>
      </div>
    );
  }

  return (
    <div className="lender-section">
      <div className="lender-section__header">
        <div className="lender-section__title">Company Information</div>
      </div>
      <div className="lender-form-grid">
        <Input label="Company name" required value={formState.companyName} onChange={handleChange("companyName")} error={errors.companyName} />
        <Input label="Website" value={formState.website ?? ""} onChange={handleChange("website")} />
        <Input label="Country" value={formState.country ?? ""} onChange={handleChange("country")} />
        <Input label="Support email" type="email" required value={formState.supportEmail ?? ""} onChange={handleChange("supportEmail")} error={errors.supportEmail} />
        <Input label="Support phone" required value={formState.supportPhone ?? ""} onChange={handleChange("supportPhone")} error={errors.supportPhone} />
        <Input label="Description" value={formState.description ?? ""} onChange={handleChange("description") as any} />
        <Input label="Logo" type="file" accept="image/*" onChange={handleLogo} />
        {formState.logoUrl && <span className="lender-pill lender-pill--muted">Logo uploaded</span>}
        <Input label="Address line 1" value={formState.address?.line1 ?? ""} onChange={handleChange("address.line1")} />
        <Input label="Address line 2" value={formState.address?.line2 ?? ""} onChange={handleChange("address.line2")} />
        <Input label="City" value={formState.address?.city ?? ""} onChange={handleChange("address.city")} />
        <Input label="State" value={formState.address?.state ?? ""} onChange={handleChange("address.state")} />
        <Input label="Postal code" value={formState.address?.postalCode ?? ""} onChange={handleChange("address.postalCode")} />
      </div>
      <div className="lender-actions">
        <Button type="button" className="ui-button--ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!isValid || updateMutation.isPending} onClick={handleSave}>
          {updateMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default CompanyEditor;
