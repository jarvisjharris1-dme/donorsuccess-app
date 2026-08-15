'use client';

export default function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-evergreen px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(15,118,110,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#0d685f] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Please wait…' : children}
    </button>
  );
}
