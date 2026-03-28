import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { fetchLenderCompany } from "@/api/lender/company";
import { fetchLenderProducts } from "@/api/lender/products";

const LenderDashboard = () => {
  const navigate = useNavigate();
  const { data: company } = useQuery({ queryKey: ["lender", "company"], queryFn: fetchLenderCompany });
  const { data: products } = useQuery({ queryKey: ["lender", "products"], queryFn: fetchLenderProducts });

  const activeCount = products?.filter((p) => p.active).length ?? 0;
  const inactiveCount = products?.length ? products.length - activeCount : 0;

  return (
    <div className="lender-card-grid">
      <Card title="Company">
        <div className="lender-section__content">
          <div className="lender-pill lender-pill--muted">{company?.companyName ?? "Your company"}</div>
          <div className="text-sm text-slate-600">Last updated {company?.updatedAt ? new Date(company.updatedAt).toLocaleDateString() : "-"}</div>
          <div className="lender-cta-row">
            <Button type="button" onClick={() => navigate("/lender/company")}>Edit Company Info</Button>
          </div>
        </div>
      </Card>
      <Card title="Products">
        <div className="lender-section__content">
          <div className="lender-pill lender-pill--success">Active: {activeCount}</div>
          <div className="lender-pill">Inactive: {inactiveCount}</div>
          <div className="text-sm text-slate-600">Total products: {products?.length ?? 0}</div>
          <div className="lender-cta-row">
            <Button type="button" onClick={() => navigate("/lender/products")}>Manage Products</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LenderDashboard;
