import type { LenderProductCategory, RateType, SubmissionMethod, TermUnit } from "./lenderManagement.types";

export type LenderAddress = {
  street: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

export type LenderPrimaryContact = {
  name: string;
  email: string;
  phone: string;
  mobilePhone: string;
};

export type LenderSubmissionConfig = {
  method: SubmissionMethod;
  sheetId: string | null;
  worksheetName: string | null;
  mappingPreview: string | null;
  sheetStatus: string | null;
  attachmentFormat: "PDF" | "CSV" | null;
  apiAuthType: "token" | "key" | null;
  apiBaseUrl: string | null;
  apiClientId: string | null;
  apiUsername: string | null;
  apiPassword: string | null;
  submissionEmail: string | null;
};

export type LenderOperationalLimits = {
  maxLendingLimit: number | null;
  maxLtv: number | null;
  maxLoanTerm: number | null;
  maxAmortization: number | null;
};

export type Lender = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  active?: boolean;
  address: LenderAddress;
  phone: string;
  website: string | null;
  description: string | null;
  internalNotes: string | null;
  processingNotes: string | null;
  primaryContact: LenderPrimaryContact;
  submissionConfig: LenderSubmissionConfig;
  operationalLimits: LenderOperationalLimits;
};

export type LenderPayload = {
  name: string;
  status: "ACTIVE" | "INACTIVE";
  phone: string;
  website: string | null;
  description: string | null;
  internal_notes?: string | null;
  street: string;
  city: string;
  region: string;
  country: string;
  postal_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  submission_method: SubmissionMethod;
  submission_email: string | null;
  submission_sheet_id?: string | null;
  submission_worksheet_name?: string | null;
  submission_mapping_preview?: string | null;
  submission_sheet_status?: string | null;
  submission_attachment_format?: "PDF" | "CSV" | null;
  submission_api_endpoint?: string | null;
  submission_api_auth_type?: "token" | "key" | null;
};

export type LenderProductTermLength = {
  min: number;
  max: number;
  unit: TermUnit;
};

export type LenderProductEligibilityFlags = {
  minimumRevenue: number | null;
  timeInBusinessMonths: number | null;
  industryRestrictions: string | null;
};

export type ProductDocumentRequirement = {
  category: string;
  required: boolean;
  description: string | null;
};

export type LenderProduct = {
  id: string;
  lenderId: string;
  productName: string;
  active: boolean;
  category: LenderProductCategory;
  country: "CA" | "US" | "BOTH";
  currency: string;
  minAmount: number;
  maxAmount: number;
  interestRateMin: number | string;
  interestRateMax: number | string;
  rateType: RateType;
  termLength: LenderProductTermLength;
  fees: string | null;
  minimumCreditScore: number | null;
  ltv: number | null;
  eligibilityRules: string | null;
  eligibilityFlags: LenderProductEligibilityFlags;
  requiredDocuments: ProductDocumentRequirement[];
};

export type LenderProductPayload = Omit<LenderProduct, "id" | "requiredDocuments"> & {
  name?: string;
  required_documents?: ProductDocumentRequirement[];
};

export type LenderProductRequirement = {
  id: string;
  documentType: string;
  required: boolean;
  minAmount: number | null;
  maxAmount: number | null;
};
