const REGIONS: Record<string, string[]> = {
  CA: ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"],
  US: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
};

type Props = {
  country: "CA" | "US";
  value: string;
  onChange: (next: string) => void;
  id?: string;
  name?: string;
};

export default function RegionSelect({ country, value, onChange, id, name }: Props) {
  const options = REGIONS[country] ?? [];
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", color: "#000" }}
    >
      <option value="">Select region</option>
      {options.map((region) => (
        <option key={region} value={region}>{region}</option>
      ))}
    </select>
  );
}
