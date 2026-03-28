import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { LenderProduct } from "@/api/lender/products";
import RequiredDocsEditor from "./RequiredDocsEditor";

export type ProductEditorValues = Partial<LenderProduct> & {
  requiredDocuments?: string[];
};

type ProductEditorDrawerProps = {
  product?: LenderProduct | null;
  categories: string[];
  onSubmit: (payload: ProductEditorValues, docs: { categories: string[]; custom: string[] }) => Promise<void>;
  onUploadForm?: (file: File) => Promise<string>;
  onClose: () => void;
};

const defaultProduct: ProductEditorValues = {
  productName: "",
  category: "",
  description: "",
  commissionPercent: 0,
  minAmount: 0,
  maxAmount: 0,
  interestRate: 0,
  termLength: "",
  additionalRequirements: "",
  active: true,
  requiredDocuments: []
};

const ProductEditorDrawer = ({ product, categories, onSubmit, onUploadForm, onClose }: ProductEditorDrawerProps) => {
  const [values, setValues] = useState<ProductEditorValues>(product ?? defaultProduct);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customDocs, setCustomDocs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = product ?? defaultProduct;
    setValues(initial);
    const custom = (initial.requiredDocuments ?? []).filter((doc) => !categories.includes(doc));
    const fromCategories = (initial.requiredDocuments ?? []).filter((doc) => categories.includes(doc));
    setCustomDocs(custom);
    setSelectedCategories(fromCategories);
  }, [product, categories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const addCustomDoc = () => setCustomDocs((prev) => [...prev, ""]);

  const updateCustomDoc = (index: number, value: string) => {
    setCustomDocs((prev) => prev.map((doc, i) => (i === index ? value : doc)));
  };

  const removeCustomDoc = (index: number) => {
    setCustomDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid = useMemo(() => Boolean(values.productName && values.category), [values]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadForm) return;
    const url = await onUploadForm(file);
    setValues((prev) => ({ ...prev, applicationFormUrl: url }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;
    setSaving(true);
    await onSubmit(
      { ...values, requiredDocuments: [...selectedCategories, ...customDocs.filter(Boolean)] },
      { categories: selectedCategories, custom: customDocs.filter(Boolean) }
    );
    setSaving(false);
    onClose();
  };

  return (
    <div className="lender-drawer" role="dialog" aria-label="Product editor">
      <form className="lender-form-grid" onSubmit={handleSubmit}>
        <Input
          label="Product name"
          required
          value={values.productName}
          onChange={(e) => setValues({ ...values, productName: e.target.value })}
        />
        <Input label="Category" required value={values.category ?? ""} onChange={(e) => setValues({ ...values, category: e.target.value })} />
        <Input label="Description" value={values.description ?? ""} onChange={(e) => setValues({ ...values, description: e.target.value })} />
        <Input
          label="Commission %"
          type="number"
          value={values.commissionPercent ?? 0}
          onChange={(e) => setValues({ ...values, commissionPercent: Number(e.target.value) })}
        />
        <Input label="Minimum amount" type="number" value={values.minAmount ?? 0} onChange={(e) => setValues({ ...values, minAmount: Number(e.target.value) })} />
        <Input label="Maximum amount" type="number" value={values.maxAmount ?? 0} onChange={(e) => setValues({ ...values, maxAmount: Number(e.target.value) })} />
        <Input label="Interest rate" type="number" value={values.interestRate ?? 0} onChange={(e) => setValues({ ...values, interestRate: Number(e.target.value) })} />
        <Input label="Term length" value={values.termLength ?? ""} onChange={(e) => setValues({ ...values, termLength: e.target.value })} />
        <Input
          label="Additional requirements"
          value={values.additionalRequirements ?? ""}
          onChange={(e) => setValues({ ...values, additionalRequirements: e.target.value })}
        />
        <label className="ui-field">
          <span className="ui-field__label">Application form (PDF)</span>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {values.applicationFormUrl && <span className="lender-pill lender-pill--muted">Form uploaded</span>}
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Status</span>
          <select className="ui-select" value={values.active ? "active" : "inactive"} onChange={(e) => setValues({ ...values, active: e.target.value === "active" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </form>

      <RequiredDocsEditor
        categories={categories}
        selectedCategories={selectedCategories}
        customDocs={customDocs}
        onToggleCategory={toggleCategory}
        onAddCustom={addCustomDoc}
        onUpdateCustom={updateCustomDoc}
        onRemoveCustom={removeCustomDoc}
      />
      <div className="lender-actions">
        <Button type="button" className="ui-button--ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || saving} onClick={handleSubmit}>
          {saving ? "Saving..." : "Save product"}
        </Button>
      </div>
    </div>
  );
};

export default ProductEditorDrawer;
