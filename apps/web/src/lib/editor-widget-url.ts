const DEFAULT_EDITOR_WIDGET_URL = 'https://cdn.jsdelivr.net/gh/virgoone/editor-widget@7783b17161248beb6872b6cc71a69e5236000701/dist/web-component.js';

export const editorWidgetUrl = import.meta.env.VITE_EDITOR_WIDGET_URL ?? DEFAULT_EDITOR_WIDGET_URL;
export const drawingRendererUrl = new URL('./drawings.js', editorWidgetUrl).href;
