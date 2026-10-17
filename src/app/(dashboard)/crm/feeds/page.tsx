import { redirect } from 'next/navigation';

export default function CRMFeedsRedirect() {
  redirect('/customers/feeds');
}
