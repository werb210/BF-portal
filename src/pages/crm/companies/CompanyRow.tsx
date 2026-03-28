import Button from "@/components/ui/Button";
import type { Company } from "@/api/crm";

interface CompanyRowProps {
  company: Company;
  onSelect: (company: Company) => void;
}

const CompanyRow = ({ company, onSelect }: CompanyRowProps) => (
  <tr data-testid={`company-row-${company.id}`}>
    <td>
      <div className="crm-name">
        <span>{company.name}</span>
        {company.referrerName ? (
          <span className="referrer-badge">Referred by {company.referrerName}</span>
        ) : null}
      </div>
    </td>
    <td>{company.industry}</td>
    <td>{company.silo}</td>
    <td>{company.owner}</td>
    <td>{company.tags.join(", ")}</td>
    <td>
      <Button onClick={() => onSelect(company)}>Details</Button>
    </td>
  </tr>
);

export default CompanyRow;
