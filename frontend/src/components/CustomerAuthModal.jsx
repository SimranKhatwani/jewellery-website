import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { customerLogin, customerRegister } from '../services/storefrontService';
import { sanitizePhoneInput, isValidPhoneNumber } from '../utils/phone';

export const CustomerAuthModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await customerLogin(loginEmail, loginPassword);
      setSuccessMsg(`Welcome back, ${user?.firstName || user?.name?.split(' ')[0] || 'Customer'}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanPhone = sanitizePhoneInput(registerPhone);
      if (cleanPhone && !isValidPhoneNumber(cleanPhone)) {
        setError('Phone number must be a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        setLoading(false);
        return;
      }
      const { user } = await customerRegister({
        email: registerEmail,
        password: registerPassword,
        firstName,
        lastName,
        phone: cleanPhone,
      });
      setSuccessMsg(`Account created for ${user?.firstName || user?.name?.split(' ')[0] || firstName || 'Customer'}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#593D30]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-xs shadow-2xl border border-[#D7C5AF]/60 overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-[#F7F1E9] border-b border-[#D7C5AF]/40">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8E8172] font-semibold block">
              Aurelle Atelier Account
            </span>
            <h2 className="text-xl font-serif-display text-[#593D30]">
              {activeTab === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8E8172] hover:text-[#593D30] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#D7C5AF]/40">
          <button
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-medium text-center transition-colors border-b-2 ${
              activeTab === 'login'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/40 hover:text-[#593D30]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`flex-1 py-3 text-xs uppercase tracking-wider font-medium text-center transition-colors border-b-2 ${
              activeTab === 'register'
                ? 'border-[#A85F49] text-[#A85F49] bg-[#FFFFFF]'
                : 'border-transparent text-[#8E8172] bg-[#F7F1E9]/40 hover:text-[#593D30]'
            }`}
          >
            New Customer Register
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xs flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xs flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8E8172] font-medium mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8172] hover:text-[#593D30] transition-colors p-0.5 focus:outline-none"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Store'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8E8172] font-medium mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8E8172] font-medium mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8E8172] font-medium mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8E8172] font-medium mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(sanitizePhoneInput(e.target.value))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                </div>
                {registerPhone && registerPhone.length > 0 && registerPhone.length < 10 && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    {10 - registerPhone.length} more digit{10 - registerPhone.length > 1 ? 's' : ''} needed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#8E8172] font-medium mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8E8172] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-1.5 text-xs bg-[#FFFFFF] border border-[#D7C5AF] rounded-xs focus:outline-none focus:border-[#A85F49]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8172] hover:text-[#593D30] transition-colors p-0.5 focus:outline-none"
                    title={showRegisterPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 bg-[#A85F49] hover:bg-[#8E4D3A] text-[#FFFFFF] text-xs uppercase tracking-widest font-medium rounded-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-[#D7C5AF]/30 text-center text-[11px] text-[#8E8172]">
            Guest carts automatically sync upon login.
          </div>
        </div>

      </div>
    </div>
  );
};
