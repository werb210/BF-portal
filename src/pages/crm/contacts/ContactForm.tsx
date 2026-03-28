import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Contact } from "@/api/crm";

interface ContactFormProps {
  onSave: (contact: Partial<Contact>) => void;
}

const ContactForm = ({ onSave }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ name, email, phone });
    setName("");
    setEmail("");
    setPhone("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" data-testid="contact-form">
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button type="submit">Save Contact</Button>
    </form>
  );
};

export default ContactForm;
