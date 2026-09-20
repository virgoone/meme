import { useEffect, useMemo, useRef, useState } from 'react';

export type RemoteEditorLeaf = {
  text?: string;
  [key: string]: unknown;
};

export type RemoteEditorValue = Array<
  RemoteEditorLeaf & {
    id?: string;
    blockId?: string;
    blockID?: string;
    type?: string;
    children?: RemoteEditorValue;
  }
>;

type RemoteEditorElement = HTMLElement & {
  value: RemoteEditorValue | string;
  focus: () => void;
};

type RemoteEditorChangeEvent = CustomEvent<{
  value?: RemoteEditorValue;
}>;

const EDITOR_WIDGET_TAG = 'bunship-editor';
const DEFAULT_EDITOR_WIDGET_SCRIPT_SRC =
  'https://cdn.jsdelivr.net/gh/virgoone/editor-widget@7a101873918c7d1b07219b1a64c18168c3e5c426/dist/web-component.js';
const EDITOR_WIDGET_SCRIPT_SRC =
  import.meta.env.VITE_EDITOR_WIDGET_URL ?? DEFAULT_EDITOR_WIDGET_SCRIPT_SRC;
const EDITOR_UPLOAD_API = `${
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''
}/api/admin/s3/upload`;
const EDITOR_UPLOAD_URL_BASE =
  import.meta.env.VITE_PUBLIC_S3_URL_BASE ||
  import.meta.env.VITE_S3_URL_BASE ||
  import.meta.env.VITE_UPLOAD_URL_BASE ||
  '/api/media/object';

const defaultValue: RemoteEditorValue = [
  {
    children: [{ text: '' }],
    type: 'p',
  },
];

let editorWidgetLoadPromise: Promise<void> | null = null;

function loadEditorWidget() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Editor widget can only load in browser.'));
  }

  if (customElements.get(EDITOR_WIDGET_TAG)) {
    return Promise.resolve();
  }

  editorWidgetLoadPromise ??= new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-editor-widget="${EDITOR_WIDGET_TAG}"]`,
    );

    const waitForDefinition = () => {
      customElements
        .whenDefined(EDITOR_WIDGET_TAG)
        .then(() => resolve())
        .catch(reject);
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        waitForDefinition();
        return;
      }
      existingScript.addEventListener('load', waitForDefinition, {
        once: true,
      });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load editor widget script.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = EDITOR_WIDGET_SCRIPT_SRC;
    script.async = true;
    script.dataset.editorWidget = EDITOR_WIDGET_TAG;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        waitForDefinition();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load editor widget script.')),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return editorWidgetLoadPromise;
}

function normalizeValue(value: RemoteEditorValue): RemoteEditorValue {
  return Array.isArray(value) && value.length > 0 ? value : defaultValue;
}

function formatValue(value: RemoteEditorValue) {
  return JSON.stringify(normalizeValue(value), null, 2);
}

function parseValue(input: string): RemoteEditorValue {
  const parsed = JSON.parse(input) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Content must be a JSON array.');
  }

  return normalizeValue(parsed as RemoteEditorValue);
}

export function RemoteEditorWidget({
  value,
  onChange,
  readOnly = false,
  className,
  minHeight = 460,
  uploadApi = EDITOR_UPLOAD_API,
  uploadUrlBase = EDITOR_UPLOAD_URL_BASE,
}: {
  value: RemoteEditorValue;
  onChange: (value: RemoteEditorValue) => void;
  readOnly?: boolean;
  className?: string;
  minHeight?: number;
  uploadApi?: string;
  uploadUrlBase?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<RemoteEditorElement | null>(null);
  const latestOnChangeRef = useRef(onChange);
  const latestValueRef = useRef(value);
  const latestSerializedValueRef = useRef('');
  const lastSerializedValueRef = useRef('');
  const settingFromPropsRef = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [fallbackDraft, setFallbackDraft] = useState(() => formatValue(value));
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const serializedValue = useMemo(() => formatValue(value), [value]);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    latestValueRef.current = value;
    latestSerializedValueRef.current = serializedValue;
  }, [serializedValue, value]);

  useEffect(() => {
    if (status !== 'error') return;
    setFallbackDraft(serializedValue);
    setFallbackError(null);
  }, [serializedValue, status]);

  useEffect(() => {
    let cancelled = false;
    let element: RemoteEditorElement | null = null;
    let themeObserver: MutationObserver | null = null;

    loadEditorWidget()
      .then(() => {
        if (cancelled || !hostRef.current) return;

        const widget = document.createElement(
          EDITOR_WIDGET_TAG,
        ) as RemoteEditorElement;
        element = widget;

        const applyTheme = () => {
          widget.setAttribute(
            'theme',
            document.documentElement.classList.contains('dark')
              ? 'dark'
              : 'light',
          );
        };
        applyTheme();
        themeObserver = new MutationObserver(applyTheme);
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        widget.setAttribute('style-preset', 'fluxship');
        widget.setAttribute('accent-color', '#65a30d');
        widget.setAttribute('placeholder', 'Start writing...');
        widget.setAttribute('upload-api', uploadApi);
        widget.setAttribute('upload-url-base', uploadUrlBase);
        widget.setAttribute('min-height', String(minHeight));
        widget.style.display = 'block';
        widget.style.minHeight = '0';

        const handleChange = (event: Event) => {
          const nextValue = (event as RemoteEditorChangeEvent).detail?.value;
          if (!nextValue || settingFromPropsRef.current) return;
          lastSerializedValueRef.current = formatValue(nextValue);
          latestOnChangeRef.current(normalizeValue(nextValue));
        };

        widget.addEventListener('change', handleChange);
        hostRef.current.replaceChildren(widget);
        elementRef.current = widget;
        setStatus('ready');

        settingFromPropsRef.current = true;
        lastSerializedValueRef.current = latestSerializedValueRef.current;
        widget.value = normalizeValue(latestValueRef.current);
        settingFromPropsRef.current = false;
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[editor-widget] failed to load', error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      elementRef.current = null;
      themeObserver?.disconnect();
      element?.remove();
    };
  }, [minHeight, uploadApi, uploadUrlBase]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || lastSerializedValueRef.current === serializedValue) return;

    settingFromPropsRef.current = true;
    lastSerializedValueRef.current = serializedValue;
    element.value = normalizeValue(value);
    settingFromPropsRef.current = false;
  }, [serializedValue, value]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (readOnly) {
      element.setAttribute('readonly', '');
    } else {
      element.removeAttribute('readonly');
    }
  }, [readOnly]);

  if (status === 'error') {
    return (
      <div className={className}>
        <textarea
          value={fallbackDraft}
          readOnly={readOnly}
          spellCheck={false}
          className='editor-json-fallback'
          style={{ minHeight }}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setFallbackDraft(nextDraft);

            try {
              const parsed = parseValue(nextDraft);
              setFallbackError(null);
              latestOnChangeRef.current(parsed);
            } catch (err) {
              setFallbackError(
                err instanceof Error ? err.message : 'Invalid JSON.',
              );
            }
          }}
        />
        {fallbackError ? (
          <div className='editor-json-error'>{fallbackError}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={hostRef}
        className='editor-widget-host'
        style={{ minHeight }}
        aria-busy={status === 'loading'}
      >
        <div className='editor-widget-loading' style={{ minHeight }}>
          <div className='editor-widget-skeleton' aria-hidden='true'>
            <div className='editor-widget-skeleton__toolbar'>
              {Array.from({ length: 8 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className='editor-widget-skeleton__body'>
              <span className='wide' />
              <span />
              <span className='short' />
              <span className='wide' />
              <span />
              <span className='medium' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
