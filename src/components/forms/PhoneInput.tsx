import { useEffect, useState } from "react";

type Country = "CA" | "US";

type PhoneInputProps = {
  value: string;
  onChange: (next: string) => void;
  country?: Country;
  id?: string;
  name?: string;
  placeholder?: string;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const formatDisplay = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const toE164 = (value: string, _country: Country) => {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
};

export default function PhoneInput({ value, onChange, country = "US", id, name, placeholder }: PhoneInputProps) {
  const [display, setDisplay] = useState(formatDisplay(value));

  useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  return (
    <input
      id={id}
      name={name}
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplay(formatDisplay(raw));
        onChange(toE164(raw, country));
      }}
      placeholder={placeholder ?? "(555) 555-5555"}
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#000" }}
    />
  );
}
