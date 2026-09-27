export type DrawingType = 'Mermaid' | 'PlantUml' | 'Graphviz' | 'Flowchart';
export type DrawingMode = 'Both' | 'Code' | 'Image';
export type ExcalidrawData = { elements: unknown[]; state?: Record<string, unknown>; files?: Record<string, unknown> };

export function drawingType(language: unknown): DrawingType | undefined {
  if (typeof language !== 'string') return undefined;
  const name = language.trim().toLowerCase().replace(/^language-/, '');
  return ({ mermaid: 'Mermaid', plantuml: 'PlantUml', puml: 'PlantUml', graphviz: 'Graphviz', dot: 'Graphviz', flowchart: 'Flowchart' } as Record<string, DrawingType>)[name];
}

export function codeDrawingData(value: unknown) {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    type: drawingType(data.drawingType ?? 'Mermaid'),
    code: typeof data.code === 'string' ? data.code : '',
    mode: (['Both', 'Code', 'Image'].includes(String(data.drawingMode)) ? data.drawingMode : 'Image') as DrawingMode,
  };
}

export function excalidrawData(value: unknown): ExcalidrawData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.elements)) return undefined;
  return {
    elements: data.elements,
    state: data.state && typeof data.state === 'object' ? data.state as Record<string, unknown> : undefined,
    files: data.files && typeof data.files === 'object' ? data.files as Record<string, unknown> : undefined,
  };
}
