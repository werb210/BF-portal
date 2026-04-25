import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ContactFormProps {
  onSave: (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }) => Promise<void> | void;
}

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const formatPhoneToE164 = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return { value: "", error: null as string | null };
  }

  if (digits.length === 10) {
    return { value: `+1${digits}`, error: null as string | null };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return { value: `+${digits}`, error: null as string | null };
  }

  return { value, error: "Enter a valid phone number." };
};

const ContactForm = ({ onSave }: ContactFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; email?: string; phone?: string }>({});

  const validateForm = () => {
    const nextErrors: { firstName?: string; email?: string; phone?: string } = {};
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirstName) {
      nextErrors.firstName = "First name is required.";
    }

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (trimmedPhone) {
      const formattedPhone = formatPhoneToE164(trimmedPhone);
      if (formattedPhone.error) {
        nextErrors.phone = formattedPhone.error;
      }
    }

    return nextErrors;
  };

  const handlePhoneBlur = () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
      return;
    }
    const formattedPhone = formatPhoneToE164(trimmedPhone);
    if (formattedPhone.error) {
      setFieldErrors((prev) => ({ ...prev, phone: formattedPhone.error ?? undefined }));
      return;
    }
    setPhone(formattedPhone.value);
    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    const formattedPhone = formatPhoneToE164(phone.trim());
    const normalizedPhone = formattedPhone.error ? "" : formattedPhone.value;

    setError(null);
    setSaving(true);
    try {
      await onSave({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: normalizedPhone
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setFieldErrors({});
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
        placeholder="First name *"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        required
        error={fieldErrors.firstName}
      />
      <Input
        placeholder="Last name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <Input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="text"
        error={fieldErrors.email}
      />
      <Input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={handlePhoneBlur}
        error={fieldErrors.phone}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save Contact"}
      </Button>
    </form>
  );
};

export default ContactForm;
