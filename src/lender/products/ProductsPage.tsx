import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  createLenderProduct,
  deleteLenderProduct,
  fetchLenderProducts,
  updateLenderProduct,
  uploadLenderApplicationForm,
  updateRequiredDocuments,
  type LenderProduct
} from "@api/lender/products";
import { fetchDocumentCategories } from "@api/lender/documents";
import ProductEditorDrawer, { type ProductEditorValues } from "./ProductEditorDrawer";

const ProductsPage = () => {
  const { data: products, refetch } = useQuery({ queryKey: ["lender", "products"], queryFn: fetchLenderProducts });
  const { data: categories = [] } = useQuery({ queryKey: ["lender", "documents", "categories"], queryFn: fetchDocumentCategories });
  const [editingProduct, setEditingProduct] = useState<LenderProduct | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (payload: { product: ProductEditorValues; docs: { categories: string[]; custom: string[] } }) => {
      if (editingProduct?.id) {
        await updateLenderProduct(editingProduct.id, payload.product);
        await updateRequiredDocuments(editingProduct.id, payload.docs);
      } else {
        const created = await createLenderProduct(payload.product);
        if (payload.docs.categories.length || payload.docs.custom.length) {
          await updateRequiredDocuments(created.id, payload.docs);
        }
      }
    },
    onSuccess: () => refetch()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLenderProduct(id),
    onSuccess: () => refetch()
  });

  const toggleMutation = useMutation({
    mutationFn: (product: LenderProduct) => updateLenderProduct(product.id, { active: !product.active }),
    onSuccess: () => refetch()
  });

  const handleSubmit = async (productValues: ProductEditorValues, docs: { categories: string[]; custom: string[] }) => {
    await saveMutation.mutateAsync({ product: productValues, docs });
    setIsDrawerOpen(false);
    setEditingProduct(null);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (product: LenderProduct) => {
    setEditingProduct(product);
    setIsDrawerOpen(true);
  };

  return (
    <div className="lender-section">
      <div className="lender-section__header">
        <div className="lender-section__title">Lender Products</div>
        <Button type="button" onClick={handleAdd}>
          Add Product
        </Button>
      </div>
      <table className="lender-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Rate</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products?.map((product) => (
            <tr key={product.id}>
              <td>{product.productName}</td>
              <td>{product.category}</td>
              <td>
                ${product.minAmount ?? 0} - ${product.maxAmount ?? 0}
              </td>
              <td>{product.interestRate ?? 0}%</td>
              <td>
                <span className={product.active ? "lender-pill lender-pill--success" : "lender-pill lender-pill--muted"}>
                  {product.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>{product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString() : "-"}</td>
              <td className="lender-cta-row">
                <Button type="button" className="ui-button--ghost" onClick={() => handleEdit(product)}>
                  Edit
                </Button>
                <Button type="button" className="ui-button--ghost" onClick={() => toggleMutation.mutate(product)}>
                  Toggle
                </Button>
                <Button type="button" className="ui-button--ghost" onClick={() => deleteMutation.mutate(product.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
          {!products?.length && (
            <tr>
              <td colSpan={7}>No products configured.</td>
            </tr>
          )}
        </tbody>
      </table>

      {isDrawerOpen && (
        <Card title={editingProduct ? "Edit product" : "Add product"}>
          <ProductEditorDrawer
            product={editingProduct}
            categories={categories}
            onSubmit={handleSubmit}
            onUploadForm={(file) =>
              editingProduct?.id
                ? uploadLenderApplicationForm(editingProduct.id, file).then((res) => res.url)
                : Promise.resolve(URL.createObjectURL(file))
            }
            onClose={() => setIsDrawerOpen(false)}
          />
        </Card>
      )}
    </div>
  );
};

export default ProductsPage;
