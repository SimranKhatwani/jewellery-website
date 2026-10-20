import React, { useEffect } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';

interface ReturnPolicyPageProps {
  onBack: () => void;
}

export const ReturnPolicyPage: React.FC<ReturnPolicyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#2D2A26] pt-6 md:pt-10 pb-24 px-6 sm:px-10 lg:px-16">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation Breadcrumb / Back Link */}
        <div className="mb-10 pb-4 border-b border-[#E5E0D8]">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#8E8172] hover:text-[#A85F49] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Catalogue</span>
          </button>
        </div>

        {/* Main Document Content */}
        <article className="space-y-8 font-sans">
          
          {/* Main Title */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1C1917] tracking-tight">
              Return &amp; Exchange Policy
            </h1>
            
            <p className="mt-6 text-[15px] sm:text-base text-[#57534E] leading-relaxed">
              At AURELLE, shop with confidence with our no questions asked return policy. Here’s our clear and transparent policy for returns, exchanges, and refunds.
            </p>
          </div>

          {/* Section 1: For Demifine, Gold, and LGD */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              For Demifine®, Gold, And Lab-Grown Diamonds (LGD) :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>You can raise a return request from here within 2 days of the delivery of the order.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>Items sold at a strike-through or discounted price (without applying a coupon) are eligible for return.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>For Gold product returns, please ensure that all freebies received with the order are returned along with the product.</span>
              </li>
            </ul>
          </section>

          {/* Section 2: Return Conditions */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              Return Conditions :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>Items must be unused, with original packaging and tags intact.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>An unboxing video is required to process any claims for missing items in your order. Please ensure you record the package being opened from the sealed state for your claim to be considered in the return request.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Refunds */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              Refunds :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>Refunds are processed in 7–10 working days as per RBI guidelines, following item pickup and verification.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>Prepaid orders :</strong> Refunded to original payment method.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>COD orders :</strong> Refunded to UPI or bank account provided by you.</span>
              </li>
            </ul>
          </section>

          {/* Section 4: Exchange Policy */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              Exchange Policy :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>LGD orders :</strong> LGD products can only be exchanged for other LGD items. If a customer wishes to exchange an LGD item for a Demifine® product, the total value of the selected Demifine® items must be equal to or greater than the value of the LGD item. If the value is lower, the remaining balance will be issued as store credit, which can be redeemed at checkout.</span>
              </li>
            </ul>
          </section>

          {/* Section 5: Non-Returnable Items */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              Non-Returnable Items :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>Custom-made or personalized Jewellery.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>Goodbye sale or clearance products (as mentioned on product page).</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Replacements */}
          <section className="space-y-4">
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[#1C1917]">
              Replacements :
            </h2>
            
            <ul className="space-y-3.5 text-[14.5px] sm:text-[15px] text-[#57534E] leading-relaxed pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>Damaged Item</strong> — Exchange with same item</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>Wrong Item Received</strong> — Exchange with same item</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span><strong>Size Issue</strong> — Exchange with same variant item</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#8E8172] select-none text-base leading-snug">•</span>
                <span>If the exact item is not available, our team will assist you with the closest available variant or process a refund.</span>
              </li>
            </ul>
          </section>

          {/* Final Section: Support & Connect to WhatsApp (Only at the end) */}
          <div className="pt-8 mt-12 border-t border-[#E5E0D8] space-y-4">
            <p className="text-[15px] sm:text-base text-[#1C1917] leading-relaxed font-medium">
              For support, please contact through whatsapp .We’re always here to assist you.
            </p>

            <a
              href="https://api.whatsapp.com/send?text=Hello%20AURELLE%20Support%2C%20I%20would%20like%20to%20raise%20a%20return%20%2F%20exchange%20request%20for%20my%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#A85F49] hover:bg-[#8F4E3A] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs transition-colors shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Connect on WhatsApp</span>
            </a>
          </div>

        </article>

      </div>
    </div>
  );
};
