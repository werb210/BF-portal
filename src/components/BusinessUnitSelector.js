import { jsx as _jsx } from "react/jsx-runtime";
import Select from "@/components/ui/Select";
import { useSilo } from "@/hooks/useSilo";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_BUSINESS_UNIT, normalizeBusinessUnit } from "@/types/businessUnit";
const unitLabels = {
    BF: "Boreal Financial",
    BI: "Boreal Insurance",
    SLF: "Site Level Financial"
};
const isBusinessUnit = (value) => value === "BF" || value === "BI" || value === "SLF";
const BusinessUnitSelector = () => {
    const { silo, setSilo } = useSilo();
    const { user } = useAuth();
    const businessUnits = (user?.businessUnits ?? [DEFAULT_BUSINESS_UNIT]).filter(isBusinessUnit);
    return (_jsx(Select, { label: "Business Unit", value: silo, onChange: (event) => setSilo(normalizeBusinessUnit(event.target.value)), options: (businessUnits.length ? businessUnits : [DEFAULT_BUSINESS_UNIT]).map((businessUnit) => ({
            value: businessUnit,
            label: unitLabels[businessUnit]
        })) }));
};
export default BusinessUnitSelector;
