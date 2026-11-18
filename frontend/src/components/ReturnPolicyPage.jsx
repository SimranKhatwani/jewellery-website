import React from 'react';
import { StorePolicyPageView } from './StorePolicyPageView';

export const ReturnPolicyPage = ({ storeInfo = null, onBack }) => {
  return (
    <StorePolicyPageView
      pageSlug="return-policy"
      storeInfo={storeInfo}
      onBack={onBack}
    />
  );
};
