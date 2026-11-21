/**
 * List controls ported from sluice/web/src/components/list-controls.tsx and
 * sluice/web/src/lib/list.ts: a debounced search box, the one "筛选" popover with
 * chip filters, the toolbar row, the page footer, and list state kept in the URL.
 */
import * as Popover from '@radix-ui/react-popover';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@bunship-ai/ui/lib/utils';

import { Button, IconInput, NativeSelect } from './ui';

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Case-insensitive match of every whitespace-separated term against any of the fields. */
export function matches(query: string, ...fields: (string | null | undefined)[]) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = fields.filter(Boolean).join('\n').toLowerCase();
  return terms.every((term) => hay.includes(term));
}

export type PageSlice<T> = { rows: T[]; page: number; pages: number; size: number; total: number; from: number; to: number };

/** One page of items; a page past the end shows the last page. */
export function paginate<T>(items: T[], page: number, size: number): PageSlice<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  const rows = items.slice(start, start + size);
  return { rows, page: p, pages, size, total, from: total ? start + 1 : 0, to: start + rows.length };
}

/** A page the server already cut, in the shape PageFooter reads. */
export function serverSlice<T>(rows: T[], total: number, page: number, size: number): PageSlice<T> {
  const pages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  return { rows, page, pages, size, total, from: total && rows.length ? start + 1 : 0, to: start + rows.length };
}

type ListState<K extends string> = { q: string; page: number; size: number } & Record<K, string>;

function readState<K extends string>(search: Record<string, unknown>, keys: readonly K[]): ListState<K> {
  const page = Number(search.page);
  const size = Number(search.size);
  const state = {
    q: typeof search.q === 'string' ? search.q : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
  } as ListState<K>;
  for (const key of keys) (state as Record<string, unknown>)[key] = typeof search[key] === 'string' ? search[key] : '';
  return state;
}

/**
 * Search, filters and page kept in the URL (sluice lib/list.ts useUrlList): links
 * and the back button restore a list. Changing a filter goes back to page 1;
 * typing in the search box replaces the history entry instead of adding one.
 */
export function useUrlList<K extends string>(keys: readonly K[]) {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const state = readState(search, keys);
  const set = React.useCallback(
    (patch: Partial<ListState<K>>) => {
      const onlyQuery = Object.keys(patch).every((key) => key === 'q');
      void navigate({
        to: '.',
        replace: onlyQuery,
        search: ((prev: Record<string, unknown>) => {
          const next: Record<string, unknown> = { ...prev, ...patch };
          if (!('page' in patch)) next.page = undefined;
          for (const [key, value] of Object.entries(next)) {
            if (value === '' || value === undefined || (key === 'page' && value === 1) || (key === 'size' && value === DEFAULT_PAGE_SIZE)) delete next[key];
          }
          return next;
        }) as never,
      });
    },
    [navigate],
  );
  return { state, set };
}

/** A search box that reports its text after a short pause and follows outside changes. */
export function SearchBox({ value, onChange, placeholder, label, className, delay = 200 }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  delay?: number;
}) {
  const [text, setText] = React.useState(value);
  const sent = React.useRef(value);
  const report = React.useRef(onChange);
  report.current = onChange;
  React.useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);
  React.useEffect(() => {
    if (text === sent.current) return;
    const timer = window.setTimeout(() => {
      sent.current = text;
      report.current(text);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [text, delay]);
  const flush = (next: string) => {
    sent.current = next;
    setText(next);
    report.current(next);
  };
  return (
    <div className={cn('relative min-w-0', className)}>
      <IconInput
        type='search'
        icon={<Search />}
        inputSize='md'
        aria-label={label ?? placeholder ?? '搜索'}
        placeholder={placeholder ?? '搜索'}
        value={text}
        autoComplete='off'
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            flush(text);
          } else if (event.key === 'Escape' && text) {
            event.preventDefault();
            event.stopPropagation();
            flush('');
          }
        }}
        className='pr-9 [&::-webkit-search-cancel-button]:hidden'
      />
      {text ? (
        <button
          type='button'
          aria-label='清空搜索'
          onClick={() => flush('')}
          className='absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-full text-helper hover:bg-fill hover:text-title'
        >
          <X className='size-3.5' />
        </button>
      ) : null}
    </div>
  );
}

export type FilterOption = { value: string; label: string; count?: number };

/** One filter in the popover: a label and a row of single-choice chips; "" means any. */
export function FilterChoice({ label, value, onChange, options, anyLabel }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  anyLabel?: string;
}) {
  const all = anyLabel !== undefined ? [{ value: '', label: anyLabel } as FilterOption, ...options] : options;
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, all.findIndex((option) => option.value === value));
  const move = (index: number) => {
    const next = (index + all.length) % all.length;
    const option = all[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };
  return (
    <div className='flex flex-col gap-1.5'>
      <span id={id} className='font-medium text-description type-xs'>{label}</span>
      <div role='radiogroup' aria-labelledby={id} className='flex flex-wrap gap-1.5'>
        {all.map((option, index) => (
          // biome-ignore lint/a11y/useSemanticElements: chip radios as in Sluice's FilterChoice, with roving focus
          <button
            key={option.value}
            ref={(element) => { refs.current[index] = element; }}
            type='button'
            role='radio'
            aria-checked={value === option.value}
            tabIndex={index === current ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(index + 1); }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(index - 1); }
            }}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 type-sm transition-colors focus-visible:shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--focus)] focus-visible:outline-none',
              value === option.value ? 'border-primary bg-primary text-on-primary' : 'border-border-light bg-surface text-subtitle hover:bg-fill-weak hover:text-title',
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className='tabular-nums opacity-70'>{option.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The toolbar's one "筛选" button; its badge counts the filters in effect. */
export function FilterPopover({ active, onReset, children, className }: { active: number; onReset: () => void; children: React.ReactNode; className?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button type='button' className={cn('shrink-0', className)} aria-label={active ? `筛选（已启用 ${active} 项）` : '筛选'}>
          <SlidersHorizontal />
          筛选
          {active > 0 ? <span className='grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 font-semibold text-on-primary type-xs tabular-nums'>{active}</span> : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align='end'
          sideOffset={6}
          collisionPadding={16}
          className='z-[60] flex w-[min(320px,calc(100vw-32px))] flex-col gap-3.5 rounded-ui-lg bg-surface-medium p-3.5 shadow-popover ring-[0.5px] ring-border-light data-[state=open]:animate-pop-in motion-reduce:animate-none'
        >
          {children}
          <div className='flex justify-end border-border-light border-t pt-2.5'>
            <Button type='button' size='sm' variant='ghost' disabled={!active} onClick={onReset}>重置</Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The toolbar row: search first, then the filter button and any actions. */
export function ListToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex min-w-0 items-center gap-2 sm:[&>*:first-child]:max-w-sm [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1', className)}>{children}</div>;
}

/** The range shown, rows per page, previous / next. */
export function PageFooter({ slice, onPage, onSize, className }: {
  slice: PageSlice<unknown>;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  className?: string;
}) {
  if (slice.total === 0) return null;
  return (
    <nav aria-label='分页' className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-border-light border-t px-3 py-2.5 sm:px-4', className)}>
      <span aria-live='polite' aria-atomic='true' className='font-desc text-description type-sm tabular-nums'>
        第 {slice.from}–{slice.to} 条，共 {slice.total} 条
      </span>
      <div className='flex items-center gap-2'>
        {onSize && slice.total > Math.min(...PAGE_SIZES) ? (
          <NativeSelect aria-label='每页行数' inputSize='sm' className='w-[104px]' value={String(slice.size)} onChange={(event) => onSize(Number(event.target.value))}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} 条/页</option>)}
          </NativeSelect>
        ) : null}
        {slice.pages > 1 ? (
          <div className='flex items-center gap-1'>
            <Button size='icon-sm' variant='ghost' className='max-sm:size-10' aria-label='上一页' disabled={slice.page <= 1} onClick={() => onPage(slice.page - 1)}>
              <ChevronLeft />
            </Button>
            <span className='min-w-14 text-center text-subtitle type-sm tabular-nums'>{slice.page} / {slice.pages}</span>
            <Button size='icon-sm' variant='ghost' className='max-sm:size-10' aria-label='下一页' disabled={slice.page >= slice.pages} onClick={() => onPage(slice.page + 1)}>
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
