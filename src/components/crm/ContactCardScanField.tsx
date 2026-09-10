import BusinessCardScanButton from '../BusinessCardScanButton';
import { toContactPrefill, mergePrefill } from '../../native/cardScanPrefill';
import type { ContactPrefill } from '../../native/cardScanPrefill';

// v114-card-scan-mount
type Props = {
  onPrefill: (prefill: ContactPrefill) => void;
  className?: string;
};

export default function ContactCardScanField({ onPrefill, className }: Props) {
  return (
    <div className={className} data-testid="contact-card-scan">
      <BusinessCardScanButton onScanned={(card: unknown) => onPrefill(toContactPrefill(card))} />
    </div>
  );
}

export { mergePrefill };
