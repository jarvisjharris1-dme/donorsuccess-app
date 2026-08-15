import { initials } from '@/lib/format';

export default function DonorAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 font-display font-bold text-evergreen"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
