import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Company } from "@/api/crm";

interface CompanyFormProps {
  onSave: (company: Partial<Company>) => void;
}

const CompanyForm = ({ onSave }: CompanyFormProps) => {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ name, industry });
    setName("");
    setIndustry("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" data-testid="company-form">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      <Button type="submit">Save Company</Button>
    </form>
  );
};

export default CompanyForm;
