import { ContactType } from '@prisma/client';
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_STYLES } from '@/lib/contact-types';

export default function ContactTypeBadge({ type }: { type: ContactType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${CONTACT_TYPE_STYLES[type]}`}
    >
      {CONTACT_TYPE_LABELS[type]}
    </span>
  );
}
