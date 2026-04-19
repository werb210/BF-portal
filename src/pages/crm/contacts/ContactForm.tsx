import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ContactFormProps {
  onSave: (data: { name: string; email: string; phone: string }) => Promise<void> | void;
}

const ContactForm = ({ onSave }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      setName("");
      setEmail("");
      setPhone("");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" data-testid="contact-form">
      {error && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{error}</p>}
      <Input
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
      />
      <Input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Contact"}
      </Button>
    </form>
  );
};

export default ContactForm;
