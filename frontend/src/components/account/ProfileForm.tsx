'use client';

/**
 * ProfileForm Component
 * Phase 3: Editable profile form for updating user name and email
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { colors, spacing, typography } from '@/config/visual-effects';
import { updateUserProfile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { Loader2, Save } from 'lucide-react';

interface ProfileFormProps {
  user: User | null;
  onUpdate?: () => void;
  loading?: boolean;
}

export function ProfileForm({ user, onUpdate, loading: initialLoading }: ProfileFormProps) {
  const { t } = useTranslation(['account', 'common']);
  const router = useRouter();
  const { currentLanguageLabel } = useLanguagePreference();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const hasChanges = user && (name !== user.name || email !== user.email);

  const handleSave = async () => {
    if (!user || !hasChanges) return;

    setSaving(true);
    try {
      const response = await updateUserProfile({
        name: name !== user.name ? name : undefined,
        email: email !== user.email ? email : undefined,
      });

      if (response.error) {
        toast.error(response.error.message || t('account.profile.updateFailed'));
        return;
      }

      toast.success(t('account.profile.updateSuccess'));
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('account.profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
    setIsEditing(false);
  };

  if (initialLoading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('account.sections.profile.title')}</CardTitle>
          <CardDescription>{t('account.sections.profile.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("space-y-4")}>
            <div className={cn("h-10 w-full", colors.background.tertiary, "rounded animate-pulse")} />
            <div className={cn("h-10 w-full", colors.background.tertiary, "rounded animate-pulse")} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.sections.profile.title')}</CardTitle>
        <CardDescription>{t('account.sections.profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn("space-y-4")}>
          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
              {t('account.profile.displayName')}
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsEditing(true);
              }}
              placeholder={t('account.profile.displayNamePlaceholder')}
              disabled={saving}
            />
          </div>

          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
              {t('account.profile.email')}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setIsEditing(true);
              }}
              placeholder={t('account.profile.emailPlaceholder')}
              disabled={saving}
            />
            <p className={cn(typography.fontSize.xs, colors.text.tertiary)}>
              {t('account.profile.emailNote')}
            </p>
          </div>

          {/* Language Preference Display */}
          <div className={cn("space-y-2")}>
            <label className={cn(typography.fontSize.sm, typography.fontWeight.medium, colors.text.primary)}>
              {t('account.profile.language')}
            </label>
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              colors.border.default,
              colors.background.secondary
            )}>
              <span className={cn(typography.fontSize.sm, colors.text.secondary)}>
                {currentLanguageLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/app/settings')}
              >
                {t('account.profile.changeLanguage')}
              </Button>
            </div>
            <p className={cn(typography.fontSize.xs, colors.text.tertiary)}>
              {t('account.profile.languageNote')}
            </p>
          </div>
        </div>
      </CardContent>
      {isEditing && (
        <CardFooter className={cn("flex justify-end", spacing.gap.sm)}>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            {t('common.buttons.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <>
                <Loader2 className={cn("mr-2 h-4 w-4 animate-spin")} />
                {t('account.profile.saving')}
              </>
            ) : (
              <>
                <Save className={cn("mr-2 h-4 w-4")} />
                {t('account.profile.save')}
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

