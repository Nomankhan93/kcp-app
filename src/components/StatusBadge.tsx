import { statusBadgeClasses, statusLabels } from '../lib/constants';
import type { ComplaintStatus } from '../lib/types';

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadgeClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
