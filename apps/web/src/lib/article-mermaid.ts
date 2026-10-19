/** Render Mermaid source locally, loading only the required Pele diagram type. */
export async function renderMermaidImage(code: string): Promise<string> {
  if (!code.trim()) return '';
  if (code.length > 100_000) throw new Error('图表源码过长，请拆分图表');

  const { renderAsync } = await import('pele/lazy');
  const { svg } = await renderAsync(code, {
    // An SVG used as an image needs intrinsic dimensions, including on download.
    responsive: false,
    limit: 100_000,
    links: false,
    images: false,
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
