import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ANNUAL_REVENUE, AR_BALANCE, COLLATERAL, MONTHLY_REVENUE, YEARS_IN_BUSINESS } from "@/constants/creditEnums";
export default function CreditReadiness() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        companyName: "",
        fullName: "",
        phone: "",
        email: "",
        industry: "",
        yearsInBusiness: "",
        annualRevenue: "",
        monthlyRevenue: "",
        arBalance: "",
        availableCollateral: "",
    });
    const update = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        // Store temporarily (later this will POST to server)
        sessionStorage.setItem("creditReadiness", JSON.stringify(form));
        navigate("/credit-results");
    };
    return (_jsxs("div", { className: "container", children: [_jsx("h1", { children: "Credit Readiness" }), _jsxs("form", { onSubmit: handleSubmit, autoComplete: "on", children: [_jsx("input", { name: "companyName", placeholder: "Company Name", autoComplete: "organization", required: true, value: form.companyName, onChange: (e) => update("companyName", e.target.value) }), _jsx("input", { name: "fullName", placeholder: "Full Name", autoComplete: "name", required: true, value: form.fullName, onChange: (e) => update("fullName", e.target.value) }), _jsx("input", { name: "phone", placeholder: "Phone", autoComplete: "tel", required: true, value: form.phone, onChange: (e) => update("phone", e.target.value) }), _jsx("input", { name: "email", placeholder: "Email", autoComplete: "email", required: true, type: "email", value: form.email, onChange: (e) => update("email", e.target.value) }), _jsx("input", { name: "industry", placeholder: "Industry", required: true, value: form.industry, onChange: (e) => update("industry", e.target.value) }), _jsxs("select", { required: true, value: form.yearsInBusiness, onChange: (e) => update("yearsInBusiness", e.target.value), children: [_jsx("option", { value: "", children: "Years in business" }), YEARS_IN_BUSINESS.map((option) => (_jsx("option", { children: option }, option)))] }), _jsxs("select", { required: true, value: form.annualRevenue, onChange: (e) => update("annualRevenue", e.target.value), children: [_jsx("option", { value: "", children: "Annual revenue" }), ANNUAL_REVENUE.map((option) => (_jsx("option", { children: option }, option)))] }), _jsxs("select", { required: true, value: form.monthlyRevenue, onChange: (e) => update("monthlyRevenue", e.target.value), children: [_jsx("option", { value: "", children: "Average monthly revenue" }), MONTHLY_REVENUE.map((option) => (_jsx("option", { children: option }, option)))] }), _jsxs("select", { required: true, value: form.arBalance, onChange: (e) => update("arBalance", e.target.value), children: [_jsx("option", { value: "", children: "Account Receivables" }), AR_BALANCE.map((option) => (_jsx("option", { children: option }, option)))] }), _jsxs("select", { required: true, value: form.availableCollateral, onChange: (e) => update("availableCollateral", e.target.value), children: [_jsx("option", { value: "", children: "Available collateral" }), COLLATERAL.map((option) => (_jsx("option", { children: option }, option)))] }), _jsx("button", { type: "submit", children: "Check Credit Readiness" })] })] }));
}
