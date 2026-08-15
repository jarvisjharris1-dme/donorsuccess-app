import Image from 'next/image';

export default function Logo({ height = 42 }: { height?: number }) {
  // Real logo asset shared from the marketing site (public/logo-header.png
  // there) — same 911x313 crop, so this fixed aspect ratio keeps it from
  // stretching at any height.
  const width = Math.round(height * (911 / 313));
  return <Image src="/logo-header.png" alt="Donor Success" width={width} height={height} priority />;
}
