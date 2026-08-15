import { ContactType } from '@prisma/client';

export const CONTACT_TYPES: ContactType[] = [
  ContactType.EXECUTIVE,
  ContactType.INFLUENCER,
  ContactType.DONOR,
  ContactType.ADVOCATE,
];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  EXECUTIVE: 'Executive',
  INFLUENCER: 'Influencer',
  DONOR: 'Donor',
  ADVOCATE: 'Advocate',
};

export const CONTACT_TYPE_STYLES: Record<ContactType, string> = {
  EXECUTIVE: 'bg-evergreen/10 text-evergreen',
  INFLUENCER: 'bg-sky/10 text-sky',
  DONOR: 'bg-success/10 text-success',
  ADVOCATE: 'bg-warning/10 text-warning',
};
