import React, { useEffect, useRef } from 'react';
import { adManager, AdSlotType } from '../services/ads';

interface AdBannerSlotProps {
  slot: AdSlotType;
  className?: string;
}

const SLOT_METADATA: Record<AdSlotType, { id: string; label: string; dimensions: string }> = {
  'desktop-top-banner': {
    id: 'ad-slot-desktop-top',
    label: 'AD CONTAINER // DESKTOP LEADERBOARD',
    dimensions: '728 × 90',
  },
  'mobile-bottom-banner': {
    id: 'ad-slot-mobile-bottom',
    label: 'AD CONTAINER // MOBILE BANNER',
    dimensions: '320 × 50',
  },
  'gameover-rectangle': {
    id: 'ad-slot-gameover-rect',
    label: 'AD CONTAINER // DEBRIEF SLOT',
    dimensions: '300 × 250',
  },
};

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({ slot, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const meta = SLOT_METADATA[slot];
  const isConfigured = adManager.isProviderConfigured();
  const isActive = adManager.isSlotActive(slot);

  useEffect(() => {
    const el = containerRef.current;
    if (el && isConfigured) {
      adManager.mountSlot(slot, el);
      return () => {
        adManager.unmountSlot(slot, el);
      };
    }
  }, [slot, isConfigured]);

  if (!isActive) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement Slot"
      data-ad-slot={slot}
      id={meta.id}
      ref={containerRef}
      className={`relative select-none flex items-center justify-center rounded-md border border-dashed border-slate-800/80 bg-[#080A15]/80 text-slate-500 overflow-hidden ${className}`}
    >
      {!isConfigured && (
        <div className="flex items-center gap-2.5 px-3 py-1 text-[10px] font-mono-telemetry tracking-widest uppercase text-slate-500/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-700" />
          <span>{meta.label}</span>
          <span className="text-slate-600">({meta.dimensions})</span>
        </div>
      )}
    </aside>
  );
};
