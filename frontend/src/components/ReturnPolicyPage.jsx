/**
 * @file ReturnPolicyPage.jsx
 * @description Dedicated storefront route/view for displaying the tenant store's
 * return and refund policy with live content populated from tenant settings.
 */

import React from 'react';
import { StorePolicyPageView } from './StorePolicyPageView';

/**
 * ReturnPolicyPage Component
 * @param {Object} props
 * @param {Object|null} props.storeInfo - Active tenant storefront details
 * @param {Function} props.onBack - Callback to return to previous view
 */
export const ReturnPolicyPage = ({ storeInfo = null, onBack }) => {
  return (
    <StorePolicyPageView
      pageSlug="return-policy"
      storeInfo={storeInfo}
      onBack={onBack}
    />
  );
};
