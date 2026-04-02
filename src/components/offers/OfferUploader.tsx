import { useState, type FormEvent } from "react";
import { api } from "@/api";

type OfferUploaderProps = {
  applicationId: string;
};

const OfferUploader = ({ applicationId }: OfferUploaderProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    try {
      await api.post("/api/offers", formData);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-2" onSubmit={onSubmit}>
      <input name="applicationId" defaultValue={applicationId} hidden readOnly />
      <input name="lender" placeholder="Lender" required />
      <input name="amount" type="number" placeholder="Amount" required />
      <input name="rateFactor" placeholder="Rate/Factor" required />
      <input name="term" placeholder="Term" required />
      <input name="paymentFrequency" placeholder="Payment Frequency" required />
      <input name="expiry" type="date" />
      <input name="file" type="file" accept="application/pdf" />
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Uploading..." : "Upload Offer"}</button>
    </form>
  );
};

export default OfferUploader;
