/**
 * @file ContactSection.jsx
 * @description Storefront contact and order acquisition section rendering concierge contact cards,
 * verified distribution channels (RKB Enterprises / Amazon / Flipkart / WhatsApp), and client inquiry forms.
 */

import React, { useState } from 'react';
import { Check, MessageCircle, Mail, ExternalLink } from 'lucide-react';

/**
 * ContactSection Component
 * @param {Object} props
 * @param {Object|null} props.storeInfo - Active tenant store branding and contact configuration
 */
export const ContactSection = ({ storeInfo = null }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isAurelle = !storeInfo?.slug || storeInfo?.slug === 'aurelle';
  const brandName = storeInfo?.name || 'AURELLE';
  const s = storeInfo?.settings || storeInfo?.config || {};
  const contactSection = s.sections?.contact || {};

  if (contactSection.enabled === false) return null;

  const sectionHeading = contactSection.title || (isAurelle ? 'How to Acquire Aurelle Silver' : `How to Connect & Order with ${brandName}`);
  const contactEmail = s.footer?.contactEmail || s.supportEmail || 'concierge@aurelle.com';
  const contactPhone = s.footer?.contactPhone || s.contactPhone || '+91 98765 43210';
  const businessAddress =
    s.footer?.address ||
    (s.businessAddress?.addressLine1
      ? `${s.businessAddress.addressLine1}, ${s.businessAddress.city || ''} ${s.businessAddress.state || ''}`.trim()
      : isAurelle
      ? 'RKB Enterprises, Jaipur'
      : `${brandName} Atelier`);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
    }
  };

  return (
    <section id="contact" aria-label={`Contact ${brandName}`} className="py-20 md:py-24 bg-[#F7F1E9] border-t border-[#D7C5AF]/40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left Column: Business & Purchasing Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
                Purchasing Channels
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif-display font-light text-[#593D30] tracking-tight">
                {sectionHeading}
              </h2>
            </div>

            <p className="text-sm text-[#8E8172] leading-relaxed font-light">
              {isAurelle
                ? 'Aurelle creations are distributed in limited production batches. To purchase, contact RKB Enterprises or find us on Amazon and Flipkart.'
                : `${brandName} creations are crafted in small artisanal batches. Directly order online or reach out to our client concierge for customized allocations.`}
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/40 space-y-1 shadow-xs">
                <span className="text-[11px] uppercase tracking-wider text-[#8E8172] font-medium block">
                  {isAurelle ? 'Authorised Distributor' : 'Official Store & Concierge'}
                </span>
                <p className="text-sm font-medium text-[#593D30]">
                  {isAurelle ? 'RKB Enterprises' : brandName}
                </p>
                <p className="text-xs text-[#8E8172] font-light">
                  {businessAddress}
                </p>
              </div>

              <div className="p-4 bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/40 space-y-1 shadow-xs">
                <span className="text-[11px] uppercase tracking-wider text-[#8E8172] font-medium block">
                  Direct Inquiries & Orders
                </span>
                <p className="text-sm font-medium text-[#593D30]">
                  {contactEmail}
                </p>
                <p className="text-xs text-[#8E8172] font-light">
                  Direct phone / assistance: {contactPhone}
                </p>
              </div>

              {/* Direct Inquiry Triggers */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hello ${brandName}, I would like to inquire about purchasing fine silver jewellery.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-[#8E4D3A] transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Inquiry</span>
                </a>
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${brandName} Jewellery Inquiry`)}`}
                  className="flex-1 py-2.5 px-3 bg-[#FFFFFF] text-[#593D30] border border-[#D7C5AF] text-xs uppercase tracking-wider font-medium rounded-xs hover:border-[#A85F49] hover:text-[#A85F49] transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Atelier</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Message Box (Pure White #FFFFFF card, Burnt Terracotta #A85F49 button) */}
          <div className="lg:col-span-7 bg-[#FFFFFF] p-8 sm:p-10 rounded-xs border border-[#D7C5AF]/40 shadow-xs">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#8E8172] font-medium block mb-1">
                    Direct Inquiry
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif-display text-[#593D30]">
                    Send a Message to the Team
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-[#8E8172] font-medium block">Your Name</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full text-xs p-3 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] outline-none focus:border-[#A85F49]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#8E8172] font-medium block">Email Address</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full text-xs p-3 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] outline-none focus:border-[#A85F49]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[#8E8172] font-medium block">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Inquire about sizing, custom allocations, or RKB Enterprises distribution..."
                    className="w-full text-xs p-3 rounded-xs border border-[#D7C5AF] bg-[#FFFFFF] text-[#593D30] outline-none focus:border-[#A85F49] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-[0.2em] font-medium rounded-xs hover:bg-[#8E4D3A] transition-colors shadow-xs"
                >
                  Send Message
                </button>
              </form>
            ) : (
              <div className="py-12 text-center space-y-4">
                <Check className="w-10 h-10 text-emerald-800 mx-auto" />
                <h4 className="text-xl font-serif-display text-[#593D30]">Message Received</h4>
                <p className="text-xs text-[#8E8172] max-w-sm mx-auto leading-relaxed">
                  Thank you, {name}. Your inquiry has been forwarded to RKB Enterprises. We will respond to {email} shortly.
                </p>
                <div className="pt-2">
                  <a
                    href={`mailto:?subject=Aurelle%20Jewellery%20Inquiry%20from%20${encodeURIComponent(name)}&body=${encodeURIComponent(message)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#8E8172] hover:text-[#A85F49] font-medium underline underline-offset-4"
                  >
                    <span>Also open in your mail client</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};

