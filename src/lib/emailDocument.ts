import api from '@/lib/api';

/**
 * Render an on-screen document (e.g. the invoice print area) to an A4 PDF, as base64.
 * html-to-image lets the browser paint the element itself, so Tailwind v4 colours render correctly.
 * Long documents are split across pages.
 */
export async function elementToPdfBase64(elementId: string): Promise<string> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Document is not on screen');

  const [{ toJpeg }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const dataUrl = await toJpeg(el, {
    quality: 0.92,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    // Skip on-screen controls inside the document
    filter: (node) => !(node instanceof HTMLElement && node.classList?.contains('no-print')),
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not render the document'));
    i.src = dataUrl;
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const margin = 8;
  const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
  const imgH = (img.height * pageW) / img.width;

  if (imgH <= pageH) {
    pdf.addImage(dataUrl, 'JPEG', margin, margin, pageW, imgH);
  } else {
    // Slice the tall image into page-height strips
    const sliceHpx = Math.floor((pageH * img.width) / pageW);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    for (let y = 0, page = 0; y < img.height; y += sliceHpx, page++) {
      const h = Math.min(sliceHpx, img.height - y);
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, h);
      ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW, (h * pageW) / img.width);
    }
  }

  const uri = pdf.output('datauristring');
  return uri.slice(uri.indexOf(',') + 1);
}

export interface EmailDocumentRequest {
  docType: 'tax_invoice' | 'proforma_invoice';
  docNo: string;
  elementId: string;
  to: string;
  organizationId?: string | number | null;
  entityId?: string | number | null;
  amount?: number | null;
  dueDate?: string | null;
  filename?: string;
}

/** Make the PDF from what is on screen and email it to the customer. Returns the server message. */
export async function emailDocument(req: EmailDocumentRequest): Promise<string> {
  const pdf_base64 = await elementToPdfBase64(req.elementId);
  const res = await api.post('/mail/document', {
    doc_type: req.docType,
    doc_no: req.docNo,
    to: req.to,
    organization_id: req.organizationId ?? undefined,
    entity_id: req.entityId ?? undefined,
    amount: req.amount ?? undefined,
    due_date: req.dueDate ?? undefined,
    filename: req.filename,
    pdf_base64,
  });
  return res.data?.message || 'Email sent';
}
