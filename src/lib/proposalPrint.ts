// Shared print rules for the in-app "Proposal PDF" (print / Save as PDF window).
// Used by the quotation details page and the Ops Review page so both print the same way.

/** Statuses before BM + Ops approval: the proposal is a draft and carries a NOT APPROVED watermark. */
export const PRE_APPROVAL_STATUSES = ['Draft', 'Pending Branch Approval', 'BM Approved', 'Pending Ops Approval'];

export const isDraftProposal = (status?: string | null) => PRE_APPROVAL_STATUSES.includes(status || 'Draft');

/**
 * A4 page with 12 mm margins; table rows and sections never split across pages;
 * prices never wrap. The watermark is position:fixed, which the browser repeats
 * whole and centred on every printed page.
 */
export const PROPOSAL_PRINT_CSS = `
  @page { size: A4; margin: 12mm; }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background-color: white;
      padding: 0 !important;
      margin: 0 !important;
    }
    .no-print { display: none !important; }
    .print-container {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      max-width: 100% !important;
      border-radius: 0 !important;
    }
  }
  tr, .print-container > div { break-inside: avoid; page-break-inside: avoid; }
  .page-break-before { page-break-before: always !important; break-before: page !important; }
  thead { display: table-header-group; }
  th.text-right, td.text-right, td.font-mono { white-space: nowrap; }
  .proposal-wm {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-55deg);
    font: 900 96px 'Inter', Arial, sans-serif;
    letter-spacing: 0.06em;
    color: rgba(200, 42, 43, 0.14);
    border: 8px solid rgba(200, 42, 43, 0.14);
    border-radius: 24px;
    padding: 4px 32px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 50;
  }
  .proposal-draft-note {
    background: #FFF1F1;
    color: #B91C1C;
    border: 1px solid #FCA5A5;
    border-radius: 8px;
    font: 700 11px 'Inter', Arial, sans-serif;
    letter-spacing: 0.04em;
    text-align: center;
    padding: 7px 8px;
    margin-bottom: 14px;
  }
`;

/** Watermark + header note for draft proposals; empty for approved ones. */
export function proposalDraftMarkup(status?: string | null): string {
  if (!isDraftProposal(status)) return '';
  return `<div class="proposal-wm">NOT APPROVED</div>`;
}

export function proposalDraftNote(status?: string | null): string {
  if (!isDraftProposal(status)) return '';
  return `<div class="proposal-draft-note">DRAFT - NOT APPROVED. This proposal has not been approved yet and is subject to change.</div>`;
}
