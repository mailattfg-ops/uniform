/**
 * Robust print utility for invoices and documents to ensure pixel-perfect A4 printing
 * matching the on-screen design without modal backdrops, screen toolbars, or clipping.
 * Works seamlessly in Brave (with Shields), Chrome, Firefox, Safari, and Edge.
 */

export function printInvoiceElement(elementId: string, documentTitle: string = 'Invoice'): void {
  const printArea = document.getElementById(elementId);
  if (!printArea) {
    window.print();
    return;
  }

  // Remove any previously injected print iframe
  const existingIframe = document.getElementById('document-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create an offscreen iframe with real A4 dimensions so Chromium/Brave renders full layout
  const iframe = document.createElement('iframe');
  iframe.id = 'document-print-iframe';
  iframe.setAttribute(
    'style',
    'position: fixed; top: -10000px; left: -10000px; width: 210mm; height: 297mm; border: none; z-index: -9999; opacity: 0; pointer-events: none;'
  );
  iframe.setAttribute('title', documentTitle);
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Collect application stylesheets to ensure all Tailwind utility classes match 1:1
  let stylesHtml = '';
  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const contentHtml = printArea.innerHTML;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <base href="${origin}/">
        <title>${documentTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #18181b !important;
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body > * {
            display: block !important;
            visibility: visible !important;
          }
          .print-a4-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            min-height: auto !important;
          }
          .bg-\\[\\#991b1b\\] {
            background-color: #991b1b !important;
            color: #ffffff !important;
          }
          .bg-\\[\\#fff5f5\\] {
            background-color: #fff5f5 !important;
          }
          .border-\\[\\#fee2e2\\] {
            border-color: #fee2e2 !important;
          }
          .text-\\[\\#991b1b\\] {
            color: #991b1b !important;
          }
          .bg-\\[\\#1b4332\\] {
            background-color: #1b4332 !important;
            color: #ffffff !important;
          }
          .bg-\\[\\#f0fdf4\\] {
            background-color: #f0fdf4 !important;
          }
          .border-\\[\\#dcfce7\\] {
            border-color: #dcfce7 !important;
          }
          .text-\\[\\#1b4332\\] {
            color: #1b4332 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          img {
            max-width: 100% !important;
            image-rendering: -webkit-optimize-contrast !important;
          }
        </style>
      </head>
      <body>
        <div class="print-a4-wrapper">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const doPrint = () => {
    try {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Iframe print error, falling back:', e);
      window.print();
    }
  };

  const imgs = Array.from(iframeDoc.images);
  if (imgs.length > 0) {
    let pending = imgs.length;
    let fired = false;
    const onImgReady = () => {
      pending--;
      if (pending <= 0 && !fired) {
        fired = true;
        setTimeout(doPrint, 150);
      }
    };

    imgs.forEach((img) => {
      if (img.complete) {
        onImgReady();
      } else {
        img.onload = onImgReady;
        img.onerror = onImgReady;
      }
    });

    setTimeout(() => {
      if (!fired) {
        fired = true;
        doPrint();
      }
    }, 600);
  } else {
    setTimeout(doPrint, 150);
  }
}

