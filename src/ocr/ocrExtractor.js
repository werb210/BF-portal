import { OCR_FIELD_REGISTRY, OCR_FIELD_REGISTRY_MAP } from "./OCR_FIELD_REGISTRY";
const ocrRuns = [];
const ocrResults = [];
const ocrVersionTracker = new Map();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildLabelPattern = (label, type) => {
    const escapedLabel = escapeRegExp(label);
    switch (type) {
        case "numeric":
            return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([\\d,.$-]+)`, "i");
        case "date":
            return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{2,4})`, "i");
        default:
            return new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([^\\n]+)`, "i");
    }
};
const resolveRunId = ({ applicationId, documentId, version, extractedAt }) => `${applicationId}-${documentId}-v${version}-${extractedAt.replace(/[:.]/g, "")}`;
const getVersionKey = (applicationId, documentId) => `${applicationId}:${documentId}`;
const nextVersion = (applicationId, documentId) => {
    const key = getVersionKey(applicationId, documentId);
    const next = (ocrVersionTracker.get(key) ?? 0) + 1;
    ocrVersionTracker.set(key, next);
    return next;
};
const isFieldApplicable = (field, documentType) => field.document_types.includes("ALL") || field.document_types.includes(documentType);
const extractFieldFromPages = (field, pages) => {
    const pattern = buildLabelPattern(field.display_label, field.type);
    for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        if (!page)
            continue;
        const match = page.match(pattern);
        if (match?.[1]) {
            return { value: match[1].trim(), page: index + 1 };
        }
    }
    return null;
};
const calculateConfidence = (value) => {
    if (!value)
        return 0;
    const lengthScore = Math.min(value.length / 30, 1);
    return Number((0.6 + lengthScore * 0.4).toFixed(2));
};
export const runOcrExtraction = ({ applicationId, documentId, documentType, pages, trigger, extractedAt }) => {
    const extracted_at = extractedAt ?? new Date().toISOString();
    const version = nextVersion(applicationId, documentId);
    const run_id = resolveRunId({ applicationId, documentId, version, extractedAt: extracted_at });
    const results = OCR_FIELD_REGISTRY.reduce((acc, field) => {
        if (!isFieldApplicable(field, documentType))
            return acc;
        const extracted = extractFieldFromPages(field, pages);
        if (!extracted)
            return acc;
        acc.push({
            application_id: applicationId,
            document_id: documentId,
            field_key: field.field_key,
            extracted_value: extracted.value,
            confidence: calculateConfidence(extracted.value),
            source_page: extracted.page,
            extracted_at,
            run_id,
            version
        });
        return acc;
    }, []);
    const run = {
        run_id,
        application_id: applicationId,
        document_id: documentId,
        version,
        extracted_at,
        trigger
    };
    ocrRuns.push(run);
    ocrResults.push(...results);
    return { run, results };
};
export const getOcrResultsForApplication = (applicationId) => ocrResults.filter((result) => result.application_id === applicationId);
export const getOcrResultsForDocument = (documentId) => ocrResults.filter((result) => result.document_id === documentId);
export const getOcrRunsForDocument = (documentId) => ocrRuns.filter((run) => run.document_id === documentId);
export const clearOcrStores = () => {
    ocrRuns.length = 0;
    ocrResults.length = 0;
    ocrVersionTracker.clear();
};
export const getRegisteredFieldLabel = (fieldKey) => OCR_FIELD_REGISTRY_MAP.get(fieldKey)?.display_label ?? fieldKey;
