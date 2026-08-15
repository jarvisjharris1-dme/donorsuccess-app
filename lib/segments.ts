import { DonorSegment } from '@prisma/client';

export const DONOR_SEGMENTS: DonorSegment[] = [
  DonorSegment.INDIVIDUAL,
  DonorSegment.CORPORATE,
  DonorSegment.PHILANTHROPIC,
];

export const SEGMENT_LABELS: Record<DonorSegment, string> = {
  INDIVIDUAL: 'Individual',
  CORPORATE: 'Corporate',
  PHILANTHROPIC: 'Philanthropic',
};

export const SEGMENT_STYLES: Record<DonorSegment, string> = {
  INDIVIDUAL: 'bg-sky/10 text-sky',
  CORPORATE: 'bg-warning/10 text-warning',
  PHILANTHROPIC: 'bg-evergreen/10 text-evergreen',
};
