import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createLenderProduct, deleteLenderProduct, fetchLenderProducts, updateLenderProduct, uploadLenderApplicationForm, updateRequiredDocuments } from "@/api/lender/products";
import { fetchDocumentCategories } from "@/api/lender/documents";
import ProductEditorDrawer from "./ProductEditorDrawer";
const ProductsPage = () => {
    const { data: products, refetch } = useQuery({ queryKey: ["lender", "products"], queryFn: fetchLenderProducts });
    const { data: categories = [] } = useQuery({ queryKey: ["lender", "documents", "categories"], queryFn: fetchDocumentCategories });
    const [editingProduct, setEditingProduct] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const saveMutation = useMutation({
        mutationFn: async (payload) => {
            if (editingProduct?.id) {
                await updateLenderProduct(editingProduct.id, payload.product);
                await updateRequiredDocuments(editingProduct.id, payload.docs);
            }
            else {
                const created = await createLenderProduct(payload.product);
                if (payload.docs.categories.length || payload.docs.custom.length) {
                    await updateRequiredDocuments(created.id, payload.docs);
                }
            }
        },
        onSuccess: () => refetch()
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteLenderProduct(id),
        onSuccess: () => refetch()
    });
    const toggleMutation = useMutation({
        mutationFn: (product) => updateLenderProduct(product.id, { active: !product.active }),
        onSuccess: () => refetch()
    });
    const handleSubmit = async (productValues, docs) => {
        await saveMutation.mutateAsync({ product: productValues, docs });
        setIsDrawerOpen(false);
        setEditingProduct(null);
    };
    const handleAdd = () => {
        setEditingProduct(null);
        setIsDrawerOpen(true);
    };
    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsDrawerOpen(true);
    };
    return (_jsxs("div", { className: "lender-section", children: [_jsxs("div", { className: "lender-section__header", children: [_jsx("div", { className: "lender-section__title", children: "Lender Products" }), _jsx(Button, { type: "button", onClick: handleAdd, children: "Add Product" })] }), _jsxs("table", { className: "lender-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Category" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Rate" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Updated" }), _jsx("th", { children: "Actions" })] }) }), _jsxs("tbody", { children: [products?.map((product) => (_jsxs("tr", { children: [_jsx("td", { children: product.productName }), _jsx("td", { children: product.category }), _jsxs("td", { children: ["$", product.minAmount ?? 0, " - $", product.maxAmount ?? 0] }), _jsxs("td", { children: [product.interestRate ?? 0, "%"] }), _jsx("td", { children: _jsx("span", { className: product.active ? "lender-pill lender-pill--success" : "lender-pill lender-pill--muted", children: product.active ? "Active" : "Inactive" }) }), _jsx("td", { children: product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString() : "-" }), _jsxs("td", { className: "lender-cta-row", children: [_jsx(Button, { type: "button", className: "ui-button--ghost", onClick: () => handleEdit(product), children: "Edit" }), _jsx(Button, { type: "button", className: "ui-button--ghost", onClick: () => toggleMutation.mutate(product), children: "Toggle" }), _jsx(Button, { type: "button", className: "ui-button--ghost", onClick: () => deleteMutation.mutate(product.id), children: "Delete" })] })] }, product.id))), !products?.length && (_jsx("tr", { children: _jsx("td", { colSpan: 7, children: "No products configured." }) }))] })] }), isDrawerOpen && (_jsx(Card, { title: editingProduct ? "Edit product" : "Add product", children: _jsx(ProductEditorDrawer, { product: editingProduct, categories: categories, onSubmit: handleSubmit, onUploadForm: (file) => editingProduct?.id
                        ? uploadLenderApplicationForm(editingProduct.id, file).then((res) => res.url)
                        : Promise.resolve(URL.createObjectURL(file)), onClose: () => setIsDrawerOpen(false) }) }))] }));
};
export default ProductsPage;
