// TODO: Real server-side PDF rendering requires the `canvas` npm package
// (node-canvas) to provide an HTMLCanvasElement-compatible surface for
// pdfjs-dist.  For the MVP we skip server rendering and rely on the client
// using react-pdf / pdfjs-dist directly in the browser.

/**
 * Render a single PDF page to a base64-encoded PNG string.
 *
 * Current implementation returns a 1x1 transparent placeholder because
 * server-side canvas support is not yet wired up. The client renders
 * pages directly via react-pdf.
 *
 * @param _pdfPath  Absolute path to the PDF file on disk
 * @param _pageNumber  1-based page number to render
 * @param _dpi  Desired resolution (default 150)
 * @returns base64-encoded PNG (currently a placeholder)
 */
export async function renderPageToBase64(
  _pdfPath: string,
  _pageNumber: number,
  _dpi: number = 150
): Promise<string> {
  // TODO: Install `canvas` package and implement real rendering:
  //   import { createCanvas } from 'canvas';
  //   const page = await doc.getPage(pageNumber);
  //   const viewport = page.getViewport({ scale: dpi / 72 });
  //   const canvas = createCanvas(viewport.width, viewport.height);
  //   const ctx = canvas.getContext('2d');
  //   await page.render({ canvasContext: ctx, viewport }).promise;
  //   return canvas.toBuffer('image/png').toString('base64');

  // 1x1 transparent PNG placeholder
  const PLACEHOLDER_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  return PLACEHOLDER_PNG_BASE64;
}
