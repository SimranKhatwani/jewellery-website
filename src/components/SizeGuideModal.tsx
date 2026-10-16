import React from 'react';
import { X, Ruler, Check } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'rings' | 'anklets';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#6C6658]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#FFFFFF] rounded-xs shadow-2xl border border-[#9A8E78]/25 overflow-hidden p-6 sm:p-8 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded text-[#9A8E78] hover:text-[#6C6658] transition-colors"
          aria-label="Close size guide"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-[#9A8E78]" />
          <span className="text-xs uppercase tracking-widest text-[#9A8E78] font-medium">
            Aurelle Fit Discipline
          </span>
        </div>

        <h2 className="text-2xl font-serif-display text-[#6C6658] mb-4">
          {category === 'rings' ? 'Silver Ring Sizing Standard' : 'Silver Anklet Sizing & Drape'}
        </h2>

        {category === 'rings' ? (
          <div className="space-y-4 text-xs">
            <p className="text-[#6C6658]/85 leading-relaxed font-light">
              Our solid silver rings feature comfort-fit contoured inner shanks. If you fall between sizes, we recommend sizing up to accommodate the substantial solid metal band width.
            </p>

            <div className="overflow-x-auto border border-[#9A8E78]/20 rounded-xs">
              <table className="w-full text-left">
                <thead className="bg-[#E4E1DB]/60 text-[11px] uppercase tracking-wider text-[#6C6658] font-medium border-b border-[#9A8E78]/20">
                  <tr>
                    <th className="py-2.5 px-3">US Size</th>
                    <th className="py-2.5 px-3">Inside Diameter</th>
                    <th className="py-2.5 px-3">Circumference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#9A8E78]/10 font-mono tabular-nums text-[#6C6658]">
                  <tr><td className="py-2 px-3 font-medium">US 5</td><td className="py-2 px-3">15.7 mm</td><td className="py-2 px-3">49.3 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 6</td><td className="py-2 px-3">16.5 mm</td><td className="py-2 px-3">51.9 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 7</td><td className="py-2 px-3">17.3 mm</td><td className="py-2 px-3">54.4 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 8</td><td className="py-2 px-3">18.2 mm</td><td className="py-2 px-3">57.0 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 9</td><td className="py-2 px-3">19.0 mm</td><td className="py-2 px-3">59.5 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 10</td><td className="py-2 px-3">19.8 mm</td><td className="py-2 px-3">62.1 mm</td></tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#E4E1DB]/40 p-3 rounded-xs text-[11px] text-[#6C6658]/85 space-y-1 border border-[#9A8E78]/15">
              <span className="font-medium text-[#6C6658] block">Measuring Tip</span>
              <span>Measure your finger at room temperature at the end of the day when your fingers are at their natural volume.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-[#6C6658]/85 leading-relaxed font-light">
              Aurelle silver anklets are designed with an integrated 4cm extension chain for versatile loose or fitted drape just below the ankle bone.
            </p>

            <div className="space-y-2 border border-[#9A8E78]/20 rounded-xs p-4">
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#6C6658]">Standard Drape (21 cm + 4 cm Extender):</span>
                  <span className="text-[#9A8E78] block">Fits ankle circumferences from 20cm to 24cm (8.0" to 9.5"). Most popular recommendation.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-[#9A8E78]/15">
                <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#6C6658]">Extended Drape (24 cm + 4 cm Extender):</span>
                  <span className="text-[#9A8E78] block">Fits ankle circumferences from 23cm to 27cm (9.0" to 10.75"). For relaxed lower hang.</span>
                </div>
              </div>
            </div>

            <div className="bg-[#E4E1DB]/40 p-3 rounded-xs text-[11px] text-[#6C6658]/85 space-y-1 border border-[#9A8E78]/15">
              <span className="font-medium text-[#6C6658] block">How to Measure</span>
              <span>Wrap a flexible tape measure or piece of string just above your ankle bone, then add 1.5 cm (0.5") for comfortable drape.</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[#93826E] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs hover:bg-[#9A8E78] transition-colors shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
