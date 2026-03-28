import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { submitReferral } from "@/api/referrals";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import { getErrorMessage } from "@/utils/errors";
import { normalizeBusinessUnit } from "@/types/businessUnit";

const ReferrerPortal = () => {
  const { user } = useAuth();
  const { silo } = useSilo();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id || !user?.name) return;
    setIsSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await submitReferral({
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        website: website.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        referrerId: user.id,
        referrerName: user.name,
        silo: normalizeBusinessUnit(silo === "admin" ? "bf" : silo)
      });
      setStatus(`Referral submitted. CRM contact ${response.contact.name} created.`);
      setBusinessName("");
      setContactName("");
      setWebsite("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to submit referral."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="referrer-card">
      <div className="referrer-card__header">
        <h2>Submit a Referral</h2>
        <p>Send a prospective borrower to our team. We will follow up within one business day.</p>
      </div>
      <form className="referrer-form" onSubmit={handleSubmit}>
        <Input
          label="Business Name"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          required
        />
        <Input
          label="Contact Name"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          required
        />
        <Input
          label="Website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
        <div className="referrer-form__actions">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit referral"}
          </Button>
          <span className="referrer-form__note">Tagged as prospect in CRM.</span>
        </div>
        {status && <div className="referrer-form__status referrer-form__status--success">{status}</div>}
        {error && <div className="referrer-form__status referrer-form__status--error">{error}</div>}
      </form>
    </section>
  );
};

export default ReferrerPortal;
