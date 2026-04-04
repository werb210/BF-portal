import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import CompanyRow from "./CompanyRow";
import CompanyForm from "./CompanyForm";
import CompanyDetailsDrawer from "./CompanyDetailsDrawer";
import { fetchCompanies } from "@/api/crm";
import { useCrmStore } from "@/state/crm.store";
import { getErrorMessage } from "@/utils/errors";
import { getRequestId } from "@/utils/requestId";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { logger } from "@/utils/logger";
const CompaniesPage = () => {
    const { silo, setSilo } = useCrmStore();
    const [selected, setSelected] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const { data: companies = [], isLoading, error } = useQuery({
        queryKey: ["companies", silo],
        queryFn: fetchCompanies
    });
    useEffect(() => {
        if (error) {
            logger.error("Failed to load companies", { requestId: getRequestId(), error });
        }
    }, [error]);
    useEffect(() => {
        if (!isLoading && !error) {
            emitUiTelemetry("data_loaded", { view: "crm_companies", count: companies.length });
        }
    }, [companies.length, error, isLoading]);
    const filtered = companies.filter((company) => !search || company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.industry.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "page", "data-testid": "companies-page", children: [_jsxs(Card, { title: "Companies", actions: _jsxs("div", { className: "flex gap-2", children: [_jsxs(Select, { value: silo, onChange: (e) => setSilo(e.target.value), children: [_jsx("option", { value: "BF", children: "BF" }), _jsx("option", { value: "BI", children: "BI" }), _jsx("option", { value: "SLF", children: "SLF" })] }), _jsx(Button, { onClick: () => setShowForm(true), children: "Add Company" })] }), children: [_jsx("div", { className: "flex gap-2 mb-2 items-center", children: _jsx(Input, { placeholder: "Search", value: search, onChange: (e) => setSearch(e.target.value) }) }), error && _jsx("p", { className: "text-red-700", children: getErrorMessage(error, "Unable to load companies.") }), !error && (_jsxs(Table, { headers: ["Name", "Industry", "Silo", "Owner", "Tags", "Actions"], children: [isLoading && (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: "Loading companies\u2026" }) })), !isLoading &&
                                filtered.map((company) => (_jsx(CompanyRow, { company: company, onSelect: setSelected }, company.id))), !isLoading && filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, children: "No companies found for this search." }) }))] }))] }), showForm && (_jsx(Card, { title: "New Company", actions: _jsx(Button, { onClick: () => setShowForm(false), children: "Close" }), children: _jsx(CompanyForm, { onSave: () => setShowForm(false) }) })), _jsx(CompanyDetailsDrawer, { company: selected, onClose: () => setSelected(null) })] }));
};
export default CompaniesPage;
