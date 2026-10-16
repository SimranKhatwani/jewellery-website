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
    <div className="fixed inset-0 z-50 bg-[#593D30]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#FFFFFF] rounded-xs shadow-2xl border border-[#D7C5AF]/40 overflow-hidden p-6 sm:p-8 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
          aria-label="Close size guide"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-[#A85F49]" />
          <span className="text-xs uppercase tracking-widest text-[#8E8172] font-medium">
            Aurelle Fit Discipline
          </span>
        </div>

        <h2 className="text-2xl font-serif-display text-[#593D30] mb-4">
          {category === 'rings' ? 'Silver Ring Sizing Standard' : 'Silver Anklet Sizing & Drape'}
        </h2>

        {category === 'rings' ? (
          <div className="space-y-4 text-xs">
            <p className="text-[#593D30]/85 leading-relaxed font-light">
              Our solid silver rings feature comfort-fit contoured inner shanks. If you fall between sizes, we recommend sizing up to accommodate the substantial solid metal band width.
            </p>

            <div className="overflow-x-auto border border-[#D7C5AF]/40 rounded-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F7F1E9] text-[11px] uppercase tracking-wider text-[#593D30] font-medium border-b border-[#D7C5AF]/30">
                  <tr>
                    <th className="py-2.5 px-3">US Size</th>
                    <th className="py-2.5 px-3">Inside Diameter</th>
                    <th className="py-2.5 px-3">Circumference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7C5AF]/20 font-mono tabular-nums text-[#593D30]">
                  <tr><td className="py-2 px-3 font-medium">US 5</td><td className="py-2 px-3">15.7 mm</td><td className="py-2 px-3">49.3 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 6</td><td className="py-2 px-3">16.5 mm</td><td className="py-2 px-3">51.9 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 7</td><td className="py-2 px-3">17.3 mm</td><td className="py-2 px-3">54.4 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 8</td><td className="py-2 px-3">18.2 mm</td><td className="py-2 px-3">57.0 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 9</td><td className="py-2 px-3">19.0 mm</td><td className="py-2 px-3">59.5 mm</td></tr>
                  <tr><td className="py-2 px-3 font-medium">US 10</td><td className="py-2 px-3">19.8 mm</td><td className="py-2 px-3">62.1 mm</td></tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#F7F1E9] p-3 rounded-xs text-[11px] text-[#593D30]/90 space-y-1 border border-[#D7C5AF]/40">
              <span className="font-medium text-[#593D30] block">Measuring Tip</span>
              <span className="text-[#8E8172]">Measure your finger at room temperature at the end of the day when your fingers are at their natural volume.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <p className="text-[#593D30]/85 leading-relaxed font-light">
              Aurelle silver anklets are designed with an integrated 4cm extension chain for versatile loose or fitted drape just below the ankle bone.
            </p>

            <div className="space-y-2 border border-[#D7C5AF]/40 rounded-xs p-4">
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#593D30]">Standard Drape (21 cm + 4 cm Extender):</span>
                  <span className="text-[#8E8172] block">Fits ankle circumferences from 20cm to 24cm (8.0" to 9.5"). Most popular recommendation.</span>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-[#D7C5AF]/30">
                <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-[#593D30]">Extended Drape (24 cm + 4 cm Extender):</span>
                  <span className="text-[#8E8172] block">Fits ankle circumferences from 23cm to 27cm (9.0" to 10.75"). For relaxed lower hang.</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F1E9] p-3 rounded-xs text-[11px] text-[#593D30]/90 space-y-1 border border-[#D7C5AF]/40">
              <span className="font-medium text-[#593D30] block">How to Measure</span>
              <span className="text-[#8E8172]">Wrap a flexible tape measure or piece of string just above your ankle bone, then add 1.5 cm (0.5") for comfortable drape.</span>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs hover:bg-[#8E4D3A] transition-colors shadow-xs"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
