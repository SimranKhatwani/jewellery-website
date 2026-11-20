/**
 * @file SuperAdminApp.jsx
 * @description Platform SuperAdmin application root.
 * Verifies high-privilege administrative tokens, renders SuperAdminLogin,
 * and hosts the multi-tenant SaaS SuperAdminDashboard.
 */

import React, { useState, useEffect } from 'react';
import { checkSuperAdminSession } from './api';
import { SuperAdminLogin } from './SuperAdminLogin';
import { SuperAdminDashboard } from './SuperAdminDashboard';

/**
 * SuperAdminApp Component
 * @param {Object} props
 * @param {Function} props.onExitSuperAdmin - Navigation callback to leave SuperAdmin interface
 */
export const SuperAdminApp = ({ onExitSuperAdmin }) => {
  const [superAdminUser, setSuperAdminUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      try {
        const user = await checkSuperAdminSession();
        if (isMounted) {
          setSuperAdminUser(user);
        }
      } catch {
        if (isMounted) {
          setSuperAdminUser(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoToStoreAdmin = () => {
    window.location.hash = '';
    window.history.pushState(null, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F7F1E9] flex flex-col items-center justify-center">
        <span className="font-serif text-2xl tracking-[0.25em] text-[#593D30] font-light mb-4">
          SAAS PLATFORM
        </span>
        <div className="flex items-center gap-2 text-xs text-[#8E8172]">
          <svg className="animate-spin h-4 w-4 text-[#A85F49]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Verifying Super Admin session...
        </div>
      </div>
    );
  }

  if (!superAdminUser) {
    return (
      <SuperAdminLogin
        onLoginSuccess={(u) => setSuperAdminUser(u)}
        onBackToStore={onExitSuperAdmin}
        onGoToStoreAdmin={handleGoToStoreAdmin}
      />
    );
  }

  return (
    <SuperAdminDashboard
      user={superAdminUser}
      onLogout={() => setSuperAdminUser(null)}
      onViewStorefront={onExitSuperAdmin}
      onGoToStoreAdmin={handleGoToStoreAdmin}
    />
  );
};
