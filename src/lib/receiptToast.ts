import toast from '@/components/ui/toast';

/** After a customer login is created: tell staff whether the login details were emailed. */
export function showLoginEmailResult(creds: any) {
  if (!creds || creds.emailed === undefined) return;
  if (creds.emailed) toast.success(`Portal login emailed to ${creds.email}`);
  else toast.info(`Portal login not emailed: ${creds.email_error || 'unknown reason'}. Share it manually.`);
}

/** After POST /payments: tell staff whether the receipt email reached the customer. */
export function showReceiptEmailResult(data: any) {
  const r = data?.receipt_email;
  if (!r) return;
  if (r.sent) toast.success(`Receipt emailed to ${r.to}`);
  else toast.info(`Receipt not emailed: ${r.reason || 'unknown reason'}`);
}
