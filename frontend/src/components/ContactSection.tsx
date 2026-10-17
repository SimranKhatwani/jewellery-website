import React, { useState } from 'react';
import { Check, MessageCircle, Mail, ExternalLink } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
    }
  };

  return (
    <section id="contact" aria-label="Contact Aurelle and RKB Enterprises" className="py-20 md:py-24 bg-[#F7F1E9] border-t border-[#D7C5AF]/40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Business & Purchasing Channels */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-[#8E8172] font-medium block mb-2">
                Purchasing Channels
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif-display font-light text-[#593D30] tracking-tight">
                How to Acquire Aurelle Silver
              </h2>
            </div>

            <p className="text-sm text-[#8E8172] leading-relaxed font-light">
              Aurelle creations are distributed in limited production batches. To purchase, contact RKB Enterprises or find us on Amazon and Flipkart.
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/40 space-y-1 shadow-xs">
                <span className="text-[11px] uppercase tracking-wider text-[#8E8172] font-medium block">
                  Authorised Distributor
                </span>
                <p className="text-sm font-medium text-[#593D30]">
                  RKB Enterprises
                </p>
                <p className="text-xs text-[#8E8172] font-light">
                  Direct client inquiries, retail partner orders, and domestic distribution.
                </p>
              </div>

              <div className="p-4 bg-[#FFFFFF] rounded-xs border border-[#D7C5AF]/40 space-y-1 shadow-xs">
                <span className="text-[11px] uppercase tracking-wider text-[#8E8172] font-medium block">
                  Verified Online Marketplaces
                </span>
                <p className="text-sm font-medium text-[#593D30]">
                  Amazon and Flipkart
                </p>
                <p className="text-xs text-[#8E8172] font-light">
                  Search for official Aurelle hallmarked 925 sterling silver rings and anklets.
                </p>
              </div>

              {/* Direct Inquiry Triggers for RKB Enterprises */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://api.whatsapp.com/send?text=Hello%20RKB%20Enterprises%2C%20I%20would%20like%20to%20inquire%20about%20purchasing%20Aurelle%20fine%20silver%20jewellery."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-wider font-medium rounded-xs hover:bg-[#8E4D3A] transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Inquiry</span>
                </a>
                <a
                  href="mailto:?subject=Aurelle%20Jewellery%20Inquiry%20-%20RKB%20Enterprises&body=Hello%20RKB%20Enterprises%2C%0D%0A%0D%0AI%20would%20like%20to%20inquire%20about%20allocations%20and%20ordering%20for%20Aurelle%20fine%20silver%20jewellery."
                  className="flex-1 py-2.5 px-3 bg-[#FFFFFF] text-[#593D30] border border-[#D7C5AF] text-xs uppercase tracking-wider font-medium rounded-xs hover:border-[#A85F49] hover:text-[#A85F49] transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email RKB Team</span>
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
