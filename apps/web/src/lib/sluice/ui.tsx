/**
 * Ported from Sluice's console (sluice/web/src/components/ui/*, components/common.tsx).
 * Markup and class lists follow the originals; Sluice's type scale and radii are
 * the `type-*` / `rounded-ui-*` utilities here (styles.css), and its `--border`
 * line is `border-border-strong`. Variants are plain maps instead of cva.
 */
import { Slot } from '@bunship-ai/ui/components/slot';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@bunship-ai/ui/lib/utils';

// ---- Button (sluice ui/button.tsx) -------------------------------------------------

const buttonBase =
  'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full border border-transparent font-medium transition-[background-color,border-color,color,transform] duration-100 ease-in-out active:scale-[0.98] disabled:pointer-events-none aria-disabled:pointer-events-none [&_svg]:shrink-0';

const buttonVariant = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed disabled:bg-primary-disabled disabled:text-on-primary-disabled aria-disabled:bg-primary-disabled aria-disabled:text-on-primary-disabled',
  secondary:
    'bg-secondary text-title hover:bg-secondary-hover active:bg-secondary-pressed disabled:bg-secondary-disabled disabled:text-disabled aria-disabled:bg-secondary-disabled aria-disabled:text-disabled',
  outline: 'border-border-strong bg-transparent text-subtitle hover:bg-tertiary-hover hover:text-title active:bg-tertiary-pressed disabled:text-disabled',
  ghost: 'bg-transparent text-subtitle hover:bg-tertiary-hover hover:text-title active:bg-tertiary-pressed disabled:text-disabled',
  danger: 'bg-danger text-white hover:bg-danger-hover active:bg-danger-pressed disabled:bg-primary-disabled disabled:text-on-primary-disabled',
  'danger-ghost': 'bg-transparent text-danger-fg hover:bg-danger-bg active:bg-danger-bg disabled:text-disabled',
} as const;

const buttonSize = {
  xs: 'h-6 gap-1 px-2.5 type-xs [&_svg]:size-3',
  sm: 'h-8 gap-1 px-3 type-base [&_svg]:size-4 has-[>svg:first-child]:pl-2',
  md: 'h-9 gap-1.5 px-3.5 type-base [&_svg]:size-4 has-[>svg:first-child]:pl-2.5',
  lg: 'h-10 gap-1.5 px-4 type-base [&_svg]:size-[18px] has-[>svg:first-child]:pl-3',
  'icon-xs': 'size-6 [&_svg]:size-3',
  'icon-sm': 'size-8 [&_svg]:size-4',
  icon: 'size-9 [&_svg]:size-4',
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariant;
  size?: keyof typeof buttonSize;
  asChild?: boolean;
  loading?: boolean;
};

export function buttonClass(variant: keyof typeof buttonVariant = 'secondary', size: keyof typeof buttonSize = 'md', className?: string) {
  return cn(buttonBase, buttonVariant[variant], buttonSize[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, loading, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? children : <>{loading ? <Spinner /> : null}{children}</>}
    </Comp>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 animate-spin', className)} viewBox='0 0 16 16' fill='none' aria-hidden='true'>
      <circle cx='8' cy='8' r='6' stroke='currentColor' strokeOpacity='0.25' strokeWidth='1.8' />
      <path d='M14 8a6 6 0 0 0-6-6' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
    </svg>
  );
}

// ---- Badge / status pill (sluice ui/badge.tsx) ---------------------------------------

const badgeTone = {
  neutral: 'border-border-light bg-fill-weak text-subtitle',
  ok: 'border-success-border bg-success-bg text-success-fg',
  warn: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
  progress: 'border-info-border bg-info-bg text-info-fg',
  outline: 'border-border-strong bg-transparent font-medium text-description',
} as const;

export function Badge({ tone = 'neutral', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTone }) {
  return <span className={cn('inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 font-semibold type-xs [&_svg]:size-3', badgeTone[tone], className)} {...props} />;
}

export type StatusTone = 'live' | 'building' | 'failed' | 'pending' | 'sleeping' | 'idle';

/** A colored dot and a neutral label (admin.css `.status-pill`). */
export function StatusPill({ tone, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone: StatusTone }) {
  return <span data-tone={tone} className={cn('status-pill', className)} {...props} />;
}

// ---- Fields (sluice ui/input.tsx) ----------------------------------------------------

const fieldBase =
  'w-full min-w-0 border border-input-border bg-surface text-title placeholder:text-helper transition-colors hover:border-input-hover focus-visible:border-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-fill-weak disabled:text-disabled';
const inputSize = { sm: 'h-8 px-3', md: 'h-9 px-3', lg: 'h-10 px-3' } as const;

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { inputSize?: keyof typeof inputSize };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, inputSize: s = 'lg', ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, 'rounded-ui-sm type-base', inputSize[s], className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-20 rounded-ui-sm px-3.5 py-2.5 type-base', className)} {...props} />;
});

export const IconInput = React.forwardRef<HTMLInputElement, InputProps & { icon: React.ReactNode; wrapperClassName?: string }>(function IconInput(
  { icon, wrapperClassName, className, inputSize: s = 'md', ...props },
  ref,
) {
  return (
    <div className={cn('relative min-w-0', wrapperClassName)}>
      <span className='pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-helper [&_svg]:size-4'>{icon}</span>
      <Input ref={ref} inputSize={s} className={cn('pl-10', className)} {...props} />
    </div>
  );
});

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { inputSize?: keyof typeof inputSize }>(function NativeSelect(
  { className, inputSize: s = 'lg', ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(fieldBase, 'appearance-none rounded-ui-sm bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2016%2016%27%20fill=%27none%27%3E%3Cpath%20d=%27m4%206%204%204%204-4%27%20stroke=%27%237a6f6b%27%20stroke-width=%271.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 type-base', inputSize[s], className)}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  // biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor
  return <label className={cn('font-medium text-title type-base', className)} {...props} />;
}

/** Label, control and an optional hint or error, stacked (sluice ui/input.tsx Field). */
export function Field({ label, hint, error, htmlFor, className, children, aside }: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div className='flex items-center justify-between gap-2'>
        <Label htmlFor={htmlFor}>{label}</Label>
        {aside}
      </div>
      {children}
      {error ? <p role='alert' className='font-desc text-danger-fg type-xs'>{error}</p> : hint ? <p className='font-desc text-description type-xs'>{hint}</p> : null}
    </div>
  );
}

// ---- Page pieces (sluice components/common.tsx) ---------------------------------------

export function PageHeader({ title, description, actions, eyebrow, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4', className)}>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        {eyebrow ? <div className='text-description type-sm'>{eyebrow}</div> : null}
        <h1 className='min-w-0 truncate font-medium text-title type-3xl tracking-[-0.01em] max-sm:type-2xl'>{title}</h1>
        {description ? <p className='max-w-2xl text-pretty font-desc text-description type-base'>{description}</p> : null}
      </div>
      {actions ? <div className='flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5 max-sm:[&>*]:flex-1'>{actions}</div> : null}
    </div>
  );
}

export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('min-w-0 overflow-hidden rounded-ui-xl border border-border-light bg-surface', className)}>{children}</div>;
}

/** A titled group of fields or content (sluice components/common.tsx Block). */
export function Block({ title, description, actions, children, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div className='min-w-0'>
          <h2 className='font-medium text-title type-lg'>{title}</h2>
          {description ? <p className='mt-0.5 font-desc text-description type-base'>{description}</p> : null}
        </div>
        {actions ? <div className='flex shrink-0 items-center gap-1.5'>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Tile({ className, sm, ...props }: React.HTMLAttributes<HTMLSpanElement> & { sm?: boolean }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center border text-title',
        sm ? 'size-8 rounded-[10px] border-border-light bg-fill-weak text-subtitle [&_svg]:size-4' : 'size-14 rounded-ui-lg border-border-light bg-surface shadow-ui [&_svg]:size-6',
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({ icon: Icon, title, body, action, className }: {
  icon: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      <Tile><Icon strokeWidth={1.8} /></Tile>
      <h3 className='mt-4 font-medium text-title type-xl'>{title}</h3>
      {body ? <p className='mt-1 max-w-md text-pretty font-desc text-description type-base'>{body}</p> : null}
      {action ? <div className='mt-5 flex flex-wrap justify-center gap-2'>{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-ui-sm bg-fill', className)} aria-hidden='true' />;
}
