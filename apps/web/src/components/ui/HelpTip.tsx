import { useState } from 'react';

interface HelpTipProps {
  text: string;
}

export function HelpTip({ text }: HelpTipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[#f0f0f5]/20 text-[9px] font-bold leading-none text-[#f0f0f5]/40 transition-colors hover:border-[#22c55e] hover:text-[#22c55e]">
        ?
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/[0.06] bg-[#1a1a26] px-3 py-2 text-xs font-normal leading-relaxed text-[#f0f0f5]/80 shadow-xl">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1a1a26]" />
        </span>
      )}
    </span>
  );
}
