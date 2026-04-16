'use client';
import { useState } from 'react';

export default function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `https://buzzmaps.vercel.app/place/${encodeURIComponent(name)}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={share}
      className="px-3 py-1.5 bg-[#ff5b3a]/10 text-[#ff5b3a] rounded-lg text-sm font-medium hover:bg-[#ff5b3a]/20 transition-colors"
    >
      {copied ? '✓ Copied!' : '🔗 Share'}
    </button>
  );
}
