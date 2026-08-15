import { Sparkles } from 'lucide-react';

export default function ExecutiveBriefingCard({
  content,
  generatedAt,
}: {
  content: string | null;
  generatedAt: string | null;
}) {
  if (!content) return null;

  return (
    <div className="rounded-[16px] border border-evergreen/20 bg-evergreen/5 p-6">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-evergreen" />
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-evergreen">
          Briefing from Jarvis
        </h2>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-gray-900">{content}</p>
      {generatedAt && (
        <p className="mt-3 text-xs text-gray-500">
          Generated{' '}
          {new Date(generatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
