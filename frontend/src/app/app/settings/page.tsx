'use client';

/**
 * Settings Page
 * Phase 2: Multi-language support - integrated with i18n
 * Includes General, Notifications, Privacy, Account, and Preferences sections
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SelectDropdown } from '@/components/ui/SelectDropdown';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/hooks/useSettings';
import { UserSettings } from '@/types';
import { cn } from '@/lib/utils';
import { colors, spacing, typography } from '@/config/visual-effects';
import { 
  themeOptions, 
  creditLowThresholdOptions
} from '@/config/settings';
import { errorMessages } from '@/config/messages';

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation(['settings', 'common']);
  const { settings, loading, error, saving, saveError, updateSettings } = useSettings();
  
  // Local state for form values
  // Language is now managed separately via LanguageSelector component (uses user.language_preference)
  const [formValues, setFormValues] = useState<Partial<UserSettings>>({
    theme: 'system' as 'light' | 'dark' | 'system',
    notifications: {
      email: true,
      creditLowThreshold: 5,
      summaryComplete: true,
      tierUpgrade: true,
    },
    privacy: {
      dataSharing: false,
      analytics: true,
    },
    preferences: {
      defaultPreset: '',
      defaultLanguage: 'English',
      autoSave: true,
    },
  });

  // Initialize form values when settings load
  // Language is managed separately via LanguageSelector (uses user.language_preference)
  useEffect(() => {
    if (settings) {
      setFormValues({
        theme: settings.theme || 'system',
        notifications: {
          email: settings.notifications?.email ?? true,
          creditLowThreshold: settings.notifications?.creditLowThreshold ?? 5,
          summaryComplete: settings.notifications?.summaryComplete ?? true,
          tierUpgrade: settings.notifications?.tierUpgrade ?? true,
        },
        privacy: {
          dataSharing: settings.privacy?.dataSharing ?? false,
          analytics: settings.privacy?.analytics ?? true,
        },
        preferences: {
          defaultPreset: settings.preferences?.defaultPreset || '',
          defaultLanguage: settings.preferences?.defaultLanguage || 'English',
          autoSave: settings.preferences?.autoSave ?? true,
        },
      });
    }
  }, [settings]);

  // Handle individual setting changes
  const handleThemeChange = (value: string) => {
    setFormValues(prev => ({ ...prev, theme: value as 'light' | 'dark' | 'system' }));
  };

  // Language is now handled entirely by LanguageSelector component
  // No manual handling needed in this page

  const handleNotificationToggle = (key: keyof UserSettings['notifications'], value: boolean | number) => {
    setFormValues(prev => ({
      ...prev,
      notifications: { ...(prev.notifications || {}), [key]: value },
    } as Partial<UserSettings>));
  };

  const handlePrivacyToggle = (key: keyof UserSettings['privacy'], value: boolean) => {
    setFormValues(prev => ({
      ...prev,
      privacy: { ...(prev.privacy || {}), [key]: value },
    } as Partial<UserSettings>));
  };

  const handlePreferenceToggle = (key: keyof UserSettings['preferences'], value: boolean | string) => {
    setFormValues(prev => ({
      ...prev,
      preferences: { ...(prev.preferences || {}), [key]: value },
    } as Partial<UserSettings>));
  };

  // Save all settings
  // Language changes are handled separately by LanguageSelector component
  const handleSave = async () => {
    const success = await updateSettings(formValues);
    
    if (success) {
      toast.success(t('common:messages.settingsSaved'));
      
      // Apply theme change immediately if changed
      if (formValues.theme && formValues.theme !== 'system') {
        const root = document.documentElement;
        if (formValues.theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        localStorage.setItem('theme', formValues.theme);
      }
    } else {
      toast.error(saveError?.message || errorMessages.apiUnknownError);
    }
  };

  // Check if form has changes
  // Language changes are handled separately by LanguageSelector component
  const hasChanges = settings && JSON.stringify(formValues) !== JSON.stringify({
    theme: settings.theme,
    notifications: settings.notifications,
    privacy: settings.privacy,
    preferences: settings.preferences,
  });

  if (loading) {
    return (
      <div className={cn("max-w-4xl mx-auto", spacing.vertical.lg, spacing.container.pagePadding)}>
        <div className={cn("flex items-center justify-center", spacing.padding.xl)}>
          <Loader2 className={cn("h-6 w-6 animate-spin", colors.text.secondary)} />
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className={cn("max-w-4xl mx-auto", spacing.vertical.lg, spacing.container.pagePadding)}>
        <div className={cn("text-center", spacing.padding.lg)}>
          <p className={cn(typography.fontSize.base, colors.status.error, spacing.margin.md)}>
            {error.message || errorMessages.configLoadFailed}
          </p>
          <Button onClick={() => router.back()}>{t('settings:buttons.back')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-4xl mx-auto", spacing.vertical.lg, spacing.container.pagePadding)}>
      {/* Header */}
      <div className={cn("flex items-center justify-between", spacing.marginBottom.lg)}>
        <div className={cn("flex items-center", spacing.gap.md)}>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className={cn("flex items-center", spacing.gap.sm)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('settings:buttons.back')}</span>
          </Button>
          <h1 className={cn(typography.fontSize.xl, typography.fontWeight.bold, colors.text.primary)}>
            {t('settings:title')}
          </h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={cn("flex items-center", spacing.gap.sm)}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('settings:buttons.saving')}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{t('settings:buttons.save')}</span>
            </>
          )}
        </Button>
      </div>

      {/* Settings Sections */}
      <div className={cn("space-y-6", spacing.vertical.lg)}>
        {/* General Settings */}
        <SettingsSection
          title={t('settings:sections.general.title')}
          description={t('settings:sections.general.description')}
        >
          <SelectDropdown
            label={t('settings:general.theme.label')}
            description={t('settings:general.theme.description')}
            value={formValues.theme || 'system'}
            onValueChange={handleThemeChange}
            options={themeOptions.map(opt => ({ value: opt.value, label: t(`settings:general.theme.options.${opt.value}`) }))}
          />
          <LanguageSelector />
        </SettingsSection>

        {/* Notifications Settings */}
        <SettingsSection
          title={t('settings:sections.notifications.title')}
          description={t('settings:sections.notifications.description')}
        >
          <ToggleSwitch
            label={t('settings:notifications.email.label')}
            description={t('settings:notifications.email.description')}
            checked={formValues.notifications?.email ?? false}
            onCheckedChange={(checked) => handleNotificationToggle('email', checked)}
          />
          <SelectDropdown
            label={t('settings:notifications.creditLowThreshold.label')}
            description={t('settings:notifications.creditLowThreshold.description')}
            value={(formValues.notifications?.creditLowThreshold ?? 5).toString()}
            onValueChange={(value) => handleNotificationToggle('creditLowThreshold', parseInt(value, 10))}
            options={creditLowThresholdOptions as any}
          />
          <ToggleSwitch
            label={t('settings:notifications.summaryComplete.label')}
            description={t('settings:notifications.summaryComplete.description')}
            checked={formValues.notifications?.summaryComplete ?? false}
            onCheckedChange={(checked) => handleNotificationToggle('summaryComplete', checked)}
          />
          <ToggleSwitch
            label={t('settings:notifications.tierUpgrade.label')}
            description={t('settings:notifications.tierUpgrade.description')}
            checked={formValues.notifications?.tierUpgrade ?? false}
            onCheckedChange={(checked) => handleNotificationToggle('tierUpgrade', checked)}
          />
        </SettingsSection>

        {/* Privacy Settings */}
        <SettingsSection
          title={t('settings:sections.privacy.title')}
          description={t('settings:sections.privacy.description')}
        >
          <ToggleSwitch
            label={t('settings:privacy.dataSharing.label')}
            description={t('settings:privacy.dataSharing.description')}
            checked={formValues.privacy?.dataSharing ?? false}
            onCheckedChange={(checked) => handlePrivacyToggle('dataSharing', checked)}
          />
          <ToggleSwitch
            label={t('settings:privacy.analytics.label')}
            description={t('settings:privacy.analytics.description')}
            checked={formValues.privacy?.analytics ?? false}
            onCheckedChange={(checked) => handlePrivacyToggle('analytics', checked)}
          />
        </SettingsSection>

        {/* Account Settings */}
        <SettingsSection
          title={t('settings:sections.account.title')}
          description={t('settings:sections.account.description')}
        >
          <div className={cn("space-y-4", spacing.vertical.md)}>
            <p className={cn(typography.fontSize.sm, colors.text.secondary)}>
              {t('settings:account.comingSoon')}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/app/account')}
            >
              {t('settings:account.goToAccount')}
            </Button>
          </div>
        </SettingsSection>

        {/* Preferences Settings */}
        <SettingsSection
          title={t('settings:sections.preferences.title')}
          description={t('settings:sections.preferences.description')}
        >
          <ToggleSwitch
            label={t('settings:preferences.autoSave.label')}
            description={t('settings:preferences.autoSave.description')}
            checked={formValues.preferences?.autoSave ?? false}
            onCheckedChange={(checked) => handlePreferenceToggle('autoSave', checked)}
          />
        </SettingsSection>
      </div>

      {/* Save Button (Sticky at bottom on mobile) */}
      <div className={cn(
        "sticky bottom-0 bg-theme-bg border-t border-theme-border-primary",
        spacing.padding.md,
        "md:hidden"
      )}>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={cn("w-full flex items-center justify-center", spacing.gap.sm)}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('settings:buttons.saving')}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{t('settings:buttons.save')}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
