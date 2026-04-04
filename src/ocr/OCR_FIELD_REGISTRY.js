export const OCR_FIELD_REGISTRY = [
    {
        field_key: "business_name",
        display_label: "Business Name",
        document_types: ["ALL"],
        type: "string",
        tolerance: 0
    },
    {
        field_key: "tax_id",
        display_label: "Tax ID",
        document_types: ["Tax Return", "Application"],
        type: "string",
        tolerance: 0
    },
    {
        field_key: "requested_amount",
        display_label: "Requested Amount",
        document_types: ["Application"],
        type: "numeric",
        tolerance: 100
    },
    {
        field_key: "annual_revenue",
        display_label: "Annual Revenue",
        document_types: ["Financial Statement", "Tax Return"],
        type: "numeric",
        tolerance: 5000
    },
    {
        field_key: "bank_balance",
        display_label: "Bank Balance",
        document_types: ["Bank Statement"],
        type: "numeric",
        tolerance: 200
    },
    {
        field_key: "statement_date",
        display_label: "Statement Date",
        document_types: ["Bank Statement"],
        type: "date",
        tolerance: 0
    },
    {
        field_key: "invoice_total",
        display_label: "Invoice Total",
        document_types: ["Invoice"],
        type: "numeric",
        tolerance: 50
    },
    {
        field_key: "contract_start_date",
        display_label: "Contract Start Date",
        document_types: ["Contract"],
        type: "date",
        tolerance: 0
    }
];
export const OCR_FIELD_REGISTRY_MAP = new Map(OCR_FIELD_REGISTRY.map((field) => [field.field_key, field]));
export const getOcrFieldDefinition = (fieldKey) => OCR_FIELD_REGISTRY_MAP.get(fieldKey);
