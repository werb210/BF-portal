import type { OfferRecord } from "@/api/offers";

type OfferComparisonTableProps = {
  offers: OfferRecord[];
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};

const formatRate = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const OfferComparisonTable = ({ offers }: OfferComparisonTableProps) => {
  if (offers.length === 0) {
    return <div className="drawer-placeholder">No offers to compare yet.</div>;
  }

  return (
    <div className="offer-comparison">
      <table className="offer-comparison__table">
        <thead>
          <tr>
            <th>Lender</th>
            <th>Amount</th>
            <th>Rate</th>
            <th>Term</th>
            <th>Fees</th>
            <th>Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id}>
              <td>{offer.lenderName}</td>
              <td>{formatCurrency(offer.amount)}</td>
              <td>{formatRate(offer.rate)}</td>
              <td>{offer.term ?? "—"}</td>
              <td>{offer.fees ?? "—"}</td>
              <td>{formatDate(offer.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OfferComparisonTable;
