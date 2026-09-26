import { SETTINGS_GROUPS, type SettingsField } from '@meme/shared';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { useAdminSettings, useUpdateAdminSettings } from '../lib/admin-queries';
import { AdminPageHeader } from '../lib/admin-ui';

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { data: serverValues, isPending, isError, error } = useAdminSettings();
  const mutation = useUpdateAdminSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  const values: Record<string, unknown> =
    draft !== null ? draft : serverValues ?? {};

  const handleChange = (key: string, value: unknown) => {
    setDraft((prev) => ({
      ...(prev ?? values),
      [key]: value,
    }));
  };

  const handleSave = () => {
    mutation.mutate(draft ?? values, {
      onSuccess: () => setDraft(null),
    });
  };

  if (isPending) {
    return (
      <section className="admin-page">
        <AdminPageHeader title="设置" description="站点配置与服务集成。" />
        <div className="settings-shell">
          <aside className="settings-nav" aria-label="设置分组">
          {SETTINGS_GROUPS.map((g) => (
            <span key={g.title} className="settings-nav__item">
              {g.title}
            </span>
          ))}
          </aside>
          <div className="settings-panel">
            <div className="settings-field-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="settings-field">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const group = SETTINGS_GROUPS[activeTab];

  return (
    <section className="admin-page">
      <AdminPageHeader
        title="设置"
        description="管理站点配置，修改后点击保存生效。"
        action={
          <div className="settings-save-state">
            {mutation.isSuccess && (
              <span>已保存</span>
            )}
            <button
              type="button"
              className="admin-button"
              disabled={mutation.isPending}
              onClick={handleSave}
            >
              {mutation.isPending ? '保存中…' : '保存'}
            </button>
          </div>
        }
      />

      {isError && (
        <p className="admin-error">
          加载失败：{error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {mutation.isError && (
        <p className="admin-error">
          保存失败：{mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
        </p>
      )}

      <div className="settings-shell">
        <aside className="settings-nav" aria-label="设置分组">
          {SETTINGS_GROUPS.map((g, i) => (
            <button
              key={g.title}
              type="button"
              className={`settings-nav__item${i === activeTab ? ' active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <span>{g.title}</span>
              {g.description && <small>{g.description}</small>}
            </button>
          ))}
        </aside>

        {group && (
          <form
            className="settings-panel"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <header className="settings-panel__header">
              <div>
                <span className="settings-panel__eyebrow">Configuration</span>
                <h2>{group.title}</h2>
                {group.description && <p>{group.description}</p>}
              </div>
              <button
                type="submit"
                className="admin-button secondary"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? '保存中…' : '保存本组'}
              </button>
            </header>

            <div className="settings-field-grid">
              {group.fields.map((field) => (
                <SettingsFieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => handleChange(field.key, v)}
                />
              ))}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function SettingsFieldInput({
  field,
  value,
  onChange,
}: {
  field: SettingsField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const stringValue = value != null ? String(value) : '';

  switch (field.type) {
    case 'switch':
      return (
        <label className="settings-field settings-field--switch">
          <span>
            <span className="settings-field__label">{field.label}</span>
            {field.description && (
              <span className="settings-field__description">
                {field.description}
              </span>
            )}
          </span>
          <span className="settings-switch">
            <input
              type="checkbox"
              role="switch"
              aria-checked={value === 'true' || value === true}
              checked={value === 'true' || value === true}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span aria-hidden="true" />
          </span>
        </label>
      );

    case 'select':
      return (
        <label className="settings-field">
          <span className="settings-field__label">{field.label}</span>
          {field.description && (
            <span className="settings-field__description">
              {field.description}
            </span>
          )}
          <select
            className="settings-select"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      );

    case 'textarea':
      return (
        <label className="settings-field settings-field--wide">
          <span className="settings-field__label">{field.label}</span>
          {field.description && (
            <span className="settings-field__description">
              {field.description}
            </span>
          )}
          <textarea
            className="settings-textarea"
            rows={3}
            placeholder={field.placeholder}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );

    default:
      return (
        <label className="settings-field">
          <span className="settings-field__label">{field.label}</span>
          {field.description && (
            <span className="settings-field__description">
              {field.description}
            </span>
          )}
          <input
            className="settings-input"
            type={field.type === 'password' ? 'password' : 'text'}
            placeholder={field.placeholder}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );
  }
}
