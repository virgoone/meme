import widgetLock from '../../editor-widget.lock.json';

/**
 * The editor widget ships with the site: scripts/fetch-editor-widget.ts copies the
 * pinned build into public/editor-widget/<commit>/ (see editor-widget.lock.json),
 * so the admin editor and article drawings load it from this origin. Its chunks,
 * drawings.js and style.css resolve relative to web-component.js.
 * VITE_EDITOR_WIDGET_URL still overrides it (e.g. to test another build).
 */
const DEFAULT_EDITOR_WIDGET_URL = `/editor-widget/${widgetLock.commit.slice(0, 12)}/web-component.js`;

export const editorWidgetUrl = import.meta.env.VITE_EDITOR_WIDGET_URL || DEFAULT_EDITOR_WIDGET_URL;
/** Sibling of web-component.js; works for both same-origin paths and absolute URLs. */
export const drawingRendererUrl = editorWidgetUrl.replace(/[^/?#]*([?#].*)?$/, 'drawings.js');
