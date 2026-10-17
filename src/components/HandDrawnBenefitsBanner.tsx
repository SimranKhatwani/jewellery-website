import React from 'react';

// Hand-drawn authentic black and white pen & ink sketches
import truckSketchImg from '../assets/images/benefit_truck.jpg';
import crystalsSketchImg from '../assets/images/benefit_crystals.jpg';
import toolsSketchImg from '../assets/images/benefit_tools.jpg';
import giftboxSketchImg from '../assets/images/benefit_giftbox.jpg';
import ringSketchImg from '../assets/images/benefit_ring.jpg';

interface BenefitItem {
  id: string;
  image: string;
  titleLine1: string;
  titleLine2: string;
  alt: string;
}

const BENEFITS: BenefitItem[] = [
  {
    id: 'shipping',
    image: truckSketchImg,
    titleLine1: 'Free Shipping',
    titleLine2: 'Made Simple',
    alt: 'Hand-drawn ink sketch of delivery cargo truck with speed lines',
  },
  {
    id: 'silver',
    image: crystalsSketchImg,
    titleLine1: 'Silver, Beautifully',
    titleLine2: 'Detailed',
    alt: 'Hand-drawn ink sketch of pointed mineral quartz crystals cluster',
  },
  {
    id: 'craft',
    image: toolsSketchImg,
    titleLine1: 'Thoughtfully',
    titleLine2: 'Crafted',
    alt: 'Hand-drawn ink sketch of wooden craftsman box with tools and chisels',
  },
  {
    id: 'gifting',
    image: giftboxSketchImg,
    titleLine1: 'Ready for',
    titleLine2: 'Gifting',
    alt: 'Hand-drawn ink sketch of wooden jewelry gift box tied with ribbon',
  },
  {
    id: 'styling',
    image: ringSketchImg,
    titleLine1: 'Made for',
    titleLine2: 'Everyday Styling',
    alt: 'Hand-drawn ink sketch of handcrafted silver signet ring with cabochon gemstone',
  },
];

export const HandDrawnBenefitsBanner: React.FC = () => {
  return (
    <section 
      aria-label="AURELLE Craft and Service Principles" 
      className="w-full bg-[#FFFFFF] border-y border-[#D7C5AF]/30 py-16 md:py-24 px-4 sm:px-8 lg:px-12"
    >
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8 lg:gap-10 items-start justify-items-center w-full">
          {BENEFITS.map((b) => (
            <div key={b.id} className="flex flex-col items-center text-center group w-full px-2">
              {/* Large Authentic Monochrome Pen & Ink Sketch Illustration */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-56 lg:h-56 flex items-center justify-center mb-4 md:mb-6 overflow-hidden">
                <img
                  src={b.image}
                  alt={b.alt}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105 filter contrast-125"
                  loading="lazy"
                />
              </div>

              {/* Proportional High-Readability Two-Line Caption */}
              <p className="text-base sm:text-lg lg:text-xl font-medium text-[#593D30] tracking-tight leading-snug">
                <span>{b.titleLine1}</span>
                <br />
                <span>{b.titleLine2}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
