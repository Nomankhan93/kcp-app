import { statusBadgeClasses, statusLabels } from '../lib/constants';
import type { ComplaintStatus } from '../lib/types';

export function StatusBadge({ status, className = '' }: { status: ComplaintStatus; className?: string }) {
  const label = statusLabels[status];

  return (
    <span
      title={label}
      aria-label={`Status: ${label}`}
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadgeClasses[status]} ${className}`}
    >
      {label}
    </span>
  );
}
