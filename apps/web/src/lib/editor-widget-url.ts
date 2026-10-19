const DEFAULT_EDITOR_WIDGET_URL = 'https://cdn.jsdelivr.net/gh/virgoone/editor-widget@1311077aea7a23eb8839f72daed5cead6acd4a1a/dist/web-component.js';

export const editorWidgetUrl = import.meta.env.VITE_EDITOR_WIDGET_URL ?? DEFAULT_EDITOR_WIDGET_URL;
export const drawingRendererUrl = new URL('./drawings.js', editorWidgetUrl).href;
