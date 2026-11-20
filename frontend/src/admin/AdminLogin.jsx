/**
 * @file AdminLogin.jsx
 * @description Authentication screen for store administrators, managers, and staff members,
 * supporting secure credentials login, password visibility toggles, and navigation shortcuts.
 */

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { adminLogin } from './api';

/**
 * AdminLogin Component
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback invoked upon successful authentication
 * @param {Function} props.onBackToStore - Navigation handler back to customer storefront
 * @param {Function} props.onGoToSuperAdmin - Navigation handler to switch to SaaS SuperAdmin portal
 */
export const AdminLogin = ({ onLoginSuccess, onBackToStore, onGoToPlatform, onGoToSuperAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminLogin(email.trim(), password);
      if (result.success && result.admin) {
        onLoginSuccess(result.admin);
      } else {
        setErrorMsg(result.message || 'Invalid credentials. Please verify your login details.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Unable to connect to backend server. Make sure backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1E9] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#A85F49] selection:text-[#FFFFFF]">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#D7C5AF]/60 rounded-sm shadow-xl p-8 sm:p-10">
        {/* Brand Header */}
        <div className="text-center mb-8">

          <h1 className="font-serif text-3xl sm:text-4xl font-light text-[#593D30] tracking-wide mt-2">
            Catalogue Admin
          </h1>
          <p className="text-xs text-[#8E8172] mt-2 font-sans">
            Secure management portal for products, media & categories
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 bg-[#A85F49]/10 border border-[#A85F49]/30 rounded-xs text-[#A85F49] text-xs leading-relaxed flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-[#593D30] mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your E-mail"
              required
              className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] text-sm focus:outline-none focus:border-[#A85F49] focus:ring-1 focus:ring-[#A85F49] transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-[#593D30]">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}

                required
                className="w-full px-3.5 pr-10 py-2.5 bg-[#FAF7F2] border border-[#D7C5AF] rounded-xs text-[#593D30] text-sm focus:outline-none focus:border-[#A85F49] focus:ring-1 focus:ring-[#A85F49] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8172] hover:text-[#593D30] transition-colors p-0.5 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-[#593D30] hover:bg-[#A85F49] text-[#FFFFFF] text-xs uppercase tracking-[0.2em] font-medium transition-all duration-300 rounded-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Back Navigation Options */}
        <div className="mt-8 pt-6 border-t border-[#D7C5AF]/40 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onGoToPlatform || onBackToStore}
            className="text-xs text-[#593D30] hover:text-[#A85F49] font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to AURELLE Platform Home
          </button>
          <button
            type="button"
            onClick={onBackToStore}
            className="text-[11px] text-[#8E8172] hover:text-[#593D30] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            Explore Customer Storefront →
          </button>
        </div>
      </div>
    </div>
  );
};

