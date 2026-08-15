import { Info, AlertTriangle } from 'lucide-react';
import type { HelpBlock } from '@/lib/help/content';

export default function HelpBlocks({ blocks }: { blocks: HelpBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <h2 key={i} className="mt-2 text-[17px] font-bold text-gray-900">
              {block.text}
            </h2>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={i} className="text-[15px] leading-relaxed text-gray-700">
              {block.text}
            </p>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={i} className="flex flex-col gap-2">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'steps') {
          return (
            <ol key={i} className="flex flex-col gap-3">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] leading-relaxed text-gray-700">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/10 text-[12px] font-bold text-evergreen">
                    {j + 1}
                  </span>
                  <span className="pt-0.5">{item}</span>
                </li>
              ))}
            </ol>
          );
        }

        // callout
        const isWarning = block.tone === 'warning';
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-xl px-4 py-3.5 text-[14px] leading-relaxed ${
              isWarning ? 'bg-warning/10 text-gray-900' : 'bg-sky/10 text-gray-900'
            }`}
          >
            {isWarning ? (
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-warning" />
            ) : (
              <Info size={16} className="mt-0.5 flex-shrink-0 text-sky" />
            )}
            <span>{block.text}</span>
          </div>
        );
      })}
    </div>
  );
}
