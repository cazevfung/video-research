import 'react-i18next';
import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enDashboard from './en/dashboard.json';
import enHistory from './en/history.json';
import enSettings from './en/settings.json';
import enAccount from './en/account.json';
import enSummary from './en/summary.json';
import enErrors from './en/errors.json';
import enValidation from './en/validation.json';
import enAuth from './en/auth.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      navigation: typeof enNavigation;
      dashboard: typeof enDashboard;
      history: typeof enHistory;
      settings: typeof enSettings;
      account: typeof enAccount;
      summary: typeof enSummary;
      errors: typeof enErrors;
      validation: typeof enValidation;
      auth: typeof enAuth;
    };
  }
}


