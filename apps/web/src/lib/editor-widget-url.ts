const DEFAULT_EDITOR_WIDGET_URL = 'https://cdn.jsdelivr.net/gh/virgoone/editor-widget@1ae71f4057f42e44fc25202b8091ed0c9abb8dc0/dist/web-component.js';

export const editorWidgetUrl = import.meta.env.VITE_EDITOR_WIDGET_URL ?? DEFAULT_EDITOR_WIDGET_URL;
export const drawingRendererUrl = new URL('./drawings.js', editorWidgetUrl).href;
