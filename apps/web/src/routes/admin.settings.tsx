import { SETTINGS_GROUPS, type SettingsField } from '@meme/shared';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Switch } from '@bunship-ai/ui/components/switch';
import { cn } from '@bunship-ai/ui/lib/utils';

import { useAdminSettings, useUpdateAdminSettings } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, SectionCard } from '../lib/admin-ui';
import { Button, Field, Input, Label, NativeSelect, Skeleton, Textarea } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { data: serverValues, isPending, isError, error } = useAdminSettings();
  const mutation = useUpdateAdminSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  const values: Record<string, unknown> = draft !== null ? draft : serverValues ?? {};
  const dirty = draft !== null;

  const handleChange = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...(prev ?? values), [key]: value }));
  };

  const handleSave = () => {
    mutation.mutate(draft ?? values, { onSuccess: () => setDraft(null) });
  };

  const group = SETTINGS_GROUPS[activeTab];

  return (
    <AdminPage>
      <AdminPageHeader
        title='站点设置'
        description='站点、邮件、存储、广告与第三方服务配置。修改后点击保存生效。'
        action={
          <div className='flex flex-wrap items-center gap-3'>
            {mutation.isSuccess && !dirty ? <span className='font-desc text-description type-sm'>已保存</span> : dirty ? <span className='font-desc text-description type-sm'>有未保存的修改</span> : null}
            <Button type='button' variant='primary' disabled={mutation.isPending || isPending} onClick={handleSave}>
              {mutation.isPending ? '保存中…' : '保存'}
            </Button>
          </div>
        }
      />

      {isError ? <ErrorText error={error} /> : null}
      {mutation.isError ? <ErrorText error={mutation.error} /> : null}

      <div className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]'>
        <nav aria-label='设置分组' className='flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start'>
          {SETTINGS_GROUPS.map((entry, index) => (
            <button
              key={entry.title}
              type='button'
              aria-current={index === activeTab ? 'page' : undefined}
              className={cn(
                'flex min-h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-ui-lg px-3 py-2 text-left type-base transition-colors',
                index === activeTab ? 'bg-fill font-medium text-title' : 'text-description hover:bg-fill-weak hover:text-title',
              )}
              onClick={() => setActiveTab(index)}
            >
              {entry.title}
            </button>
          ))}
        </nav>

        {group ? (
          <SectionCard
            title={group.title}
            description={group.description}
            action={<Button type='submit' form='settings-form' variant='outline' size='sm' disabled={mutation.isPending || isPending}>保存本组</Button>}
          >
            {isPending ? (
              <div className='grid gap-5 md:grid-cols-2' role='status' aria-label='设置加载中'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className='grid gap-2'>
                    <Skeleton className='h-3 w-24' />
                    <Skeleton className='h-9 w-full' />
                  </div>
                ))}
              </div>
            ) : (
              <form
                id='settings-form'
                className='grid gap-5 md:grid-cols-2'
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSave();
                }}
              >
                {group.fields.map((field) => (
                  <SettingsFieldInput key={field.key} field={field} value={values[field.key]} onChange={(next) => handleChange(field.key, next)} />
                ))}
              </form>
            )}
          </SectionCard>
        ) : null}
      </div>
    </AdminPage>
  );
}

function SettingsFieldInput({ field, value, onChange }: { field: SettingsField; value: unknown; onChange: (value: unknown) => void }) {
  const stringValue = value != null ? String(value) : '';
  const id = `setting-${field.key}`;

  if (field.type === 'switch') {
    const checked = value === 'true' || value === true;
    return (
      <div className='flex items-start justify-between gap-4 rounded-ui-lg border border-border-light px-4 py-3 md:col-span-2'>
        <div className='grid gap-0.5'>
          <Label htmlFor={id}>{field.label}</Label>
          {field.description ? <span className='font-desc text-description type-xs'>{field.description}</span> : null}
        </div>
        <Switch id={id} checked={checked} onCheckedChange={(next) => onChange(next)} />
      </div>
    );
  }

  const control =
    field.type === 'select' ? (
      <NativeSelect id={id} value={stringValue} onChange={(event) => onChange(event.target.value)}>
        <option value='' disabled>{field.placeholder ?? '请选择'}</option>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </NativeSelect>
    ) : field.type === 'textarea' ? (
      <Textarea id={id} rows={3} placeholder={field.placeholder} value={stringValue} onChange={(event) => onChange(event.target.value)} />
    ) : (
      <Input
        id={id}
        type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : 'text'}
        autoComplete={field.type === 'password' ? 'new-password' : 'off'}
        placeholder={field.placeholder}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      />
    );

  return (
    <Field label={field.label} htmlFor={id} hint={field.description} className={cn('content-start', field.type === 'textarea' && 'md:col-span-2')}>
      {control}
    </Field>
  );
}
