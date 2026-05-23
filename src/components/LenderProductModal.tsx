import type { ReactNode } from "react";
import ErrorBanner from "@/components/ui/ErrorBanner";
import Input from "@/components/ui/Input";
import ModalFooterWithDelete from "@/components/ModalFooterWithDelete";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import type { LenderProductCategory, RateType, RateKind } from "@/types/lenderManagement.types";
// BF_PORTAL_BLOCK_v614_RATE_KIND_v1
import { RATE_KINDS, RATE_KIND_LABELS } from "@/types/lenderManagement.types";

export type ProductFormValues = {
  lenderId: string;
  productName: string;
  category: LenderProductCategory;
  country: string[];
  minAmount: string;
  maxAmount: string;
  minTerm: string;
  maxTerm: string;
  rateType: RateType;
  // BF_PORTAL_BLOCK_v614_RATE_KIND_v1
  rateKind: RateKind;
  // BF_PORTAL_BLOCK_v615_RATE_KIND_POLISH_v1 — only used when rateKind is
  // "monthly" or for non-standard period APR (e.g., "for 30 days").
  ratePeriodDays: string;
  interestMin: string;
  interestMax: string;
  fees: string;
  requiredDocuments: string[];
  active: boolean;
};

type LenderProductModalProps = {
  isOpen: boolean;
  title: string;
  isSaving: boolean;
  isSubmitDisabled?: boolean;
  errorMessage?: string | null;
  formValues: ProductFormValues;
  formErrors: Record<string, string>;
  lenderOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  categoryOptions: Array<{ value: LenderProductCategory; label: string; disabled?: boolean }>;
  rateTypes: RateType[];
  documentOptions: Array<{ value: string; label: string; locked?: boolean }>;
  formatRateType: (value: RateType) => string;
  onChange: (updates: Partial<ProductFormValues>) => void;
  onSubmit: () => void;
  onClose: () => void;
  onCancel: () => void;
  onDelete?: () => Promise<void> | void;
  isDeleting?: boolean;
  statusNote?: ReactNode;
};

const LenderProductModal = ({
  isOpen,
  title,
  isSaving,
  isSubmitDisabled = false,
  errorMessage,
  formValues,
  formErrors,
  lenderOptions,
  categoryOptions,
  rateTypes,
  documentOptions,
  formatRateType,
  onChange,
  onSubmit,
  onClose,
  onCancel,
  onDelete,
  isDeleting = false,
  statusNote
}: LenderProductModalProps) => {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose}>
      {errorMessage && <ErrorBanner message={errorMessage} />}
      {statusNote}
      <form
        className="management-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="management-field">
          <span className="management-field__label">Core details</span>
          <Select
            label="Lender"
            value={formValues.lenderId}
            onChange={(event) => onChange({ lenderId: event.target.value })}
          >
            <option value="">Select lender</option>
            {lenderOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </Select>
          {formErrors.lenderId && <span className="ui-field__error">{formErrors.lenderId}</span>}
          <Input
            label="Product name"
            value={formValues.productName}
            onChange={(event) => onChange({ productName: event.target.value })}
            error={formErrors.productName}
          />
          <label className="management-toggle">
            <input
              type="checkbox"
              checked={formValues.active}
              onChange={(event) => onChange({ active: event.target.checked })}
            />
            <span>Active product</span>
          </label>
          {formErrors.active && <span className="ui-field__error">{formErrors.active}</span>}
          <Select
            label="Product category"
            value={formValues.category}
            onChange={(event) =>
              onChange({ category: event.target.value as LenderProductCategory })
            }
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </Select>
          {formErrors.category && <span className="ui-field__error">{formErrors.category}</span>}
          <div className="management-grid__row">
            <div className="ui-field">
              <span className="ui-field__label">Country availability</span>
              <div className="management-docs">
                {[
                  { value: "CA", label: "Canada" },
                  { value: "US", label: "United States" }
                ].map((option) => {
                  const checked = formValues.country.includes(option.value);
                  return (
                    <label key={option.value} className="management-toggle">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...formValues.country, option.value]
                            : formValues.country.filter((value) => value !== option.value);
                          onChange({ country: next });
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          {formErrors.country && <span className="ui-field__error">{formErrors.country}</span>}
        </div>

        <div className="management-field">
          <span className="management-field__label">Amount</span>
          <div className="management-grid__row">
            <Input
              label="Minimum amount"
              value={formValues.minAmount}
              onChange={(event) => onChange({ minAmount: event.target.value })}
              error={formErrors.minAmount}
            />
            <Input
              label="Maximum amount"
              value={formValues.maxAmount}
              onChange={(event) => onChange({ maxAmount: event.target.value })}
              error={formErrors.maxAmount}
            />
          </div>
        </div>

        <div className="management-field">
          <span className="management-field__label">Terms</span>
          <div className="management-grid__row">
            <Input
              label="Min term (months)"
              value={formValues.minTerm}
              onChange={(event) => onChange({ minTerm: event.target.value })}
              error={formErrors.minTerm}
            />
            <Input
              label="Max term (months)"
              value={formValues.maxTerm}
              onChange={(event) => onChange({ maxTerm: event.target.value })}
              error={formErrors.maxTerm}
            />
          </div>
        </div>

        <div className="management-field">
          <span className="management-field__label">Pricing &amp; terms</span>
          {/* BF_PORTAL_BLOCK_v614_RATE_KIND_v1 — Rate Kind selector controls
              how interestMin/interestMax should be interpreted and labeled. */}
          <Select
            label="Rate kind"
            value={formValues.rateKind}
            onChange={(event) => onChange({ rateKind: event.target.value as RateKind })}
          >
            {RATE_KINDS.map((rk) => (
              <option key={rk} value={rk}>{RATE_KIND_LABELS[rk]}</option>
            ))}
          </Select>
          <Select
            label="Rate type"
            value={formValues.rateType}
            onChange={(event) => onChange({ rateType: event.target.value as RateType })}
          >
            {rateTypes.map((rateType) => (
              <option key={rateType} value={rateType}>
                {formatRateType(rateType)}
              </option>
            ))}
          </Select>
          {formErrors.rateType && <span className="ui-field__error">{formErrors.rateType}</span>}
          <div className="management-grid__row">
            <Input
              label={(() => {
                if (formValues.rateKind === "factor") return "Factor min (e.g. 1.24)";
                if (formValues.rateKind === "monthly") return "Interest min (% / month)";
                if (formValues.rateType === "variable") return "Interest min (Prime + X%)";
                return "Interest min (% APR)";
              })()}
              value={formValues.interestMin}
              onChange={(event) => onChange({ interestMin: event.target.value })}
              error={formErrors.interestMin}
            />
            <Input
              label={(() => {
                if (formValues.rateKind === "factor") return "Factor max (e.g. 1.45)";
                if (formValues.rateKind === "monthly") return "Interest max (% / month)";
                if (formValues.rateType === "variable") return "Interest max (Prime + Y%)";
                return "Interest max (% APR)";
              })()}
              value={formValues.interestMax}
              onChange={(event) => onChange({ interestMax: event.target.value })}
              error={formErrors.interestMax}
            />
          </div>
          {/* BF_PORTAL_BLOCK_v615_RATE_KIND_POLISH_v1 — period in days when
              the rate isn't quoted per standard year/month (e.g.,
              Brookridge "2.5% for 30 days" → ratePeriodDays = 30). */}
          {(formValues.rateKind === "monthly" || formValues.rateKind === "factor") && (
            <Input
              label="Rate period (days)"
              placeholder={formValues.rateKind === "factor" ? "e.g. 180 (typical MCA term)" : "e.g. 30"}
              value={formValues.ratePeriodDays}
              onChange={(event) => onChange({ ratePeriodDays: event.target.value })}
              error={formErrors.ratePeriodDays}
            />
          )}
        </div>

        <div className="management-field">
          <span className="management-field__label">Required documents</span>
          <div className="management-docs">
            {documentOptions.map((doc) => {
              const checked = formValues.requiredDocuments.includes(doc.value);
              return (
                <label key={doc.value} className="management-toggle">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (doc.locked) return;
                      const next = event.target.checked
                        ? [...formValues.requiredDocuments, doc.value]
                        : formValues.requiredDocuments.filter((value) => value !== doc.value);
                      onChange({ requiredDocuments: next });
                    }}
                    disabled={doc.locked}
                  />
                  <span>{doc.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <ModalFooterWithDelete
          onCancel={onCancel}
          onSave={onSubmit}
          onDelete={onDelete}
          saveDisabled={isSaving || isSubmitDisabled}
          deleting={isDeleting}
          saveLabel="Save product"
        />
      </form>
    </Modal>
  );
};

export default LenderProductModal;
