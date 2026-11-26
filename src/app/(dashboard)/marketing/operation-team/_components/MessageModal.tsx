'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Paperclip, Send, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from '@/components/ui/toast';
import api from '@/lib/api';
import { Quotation } from '../_lib/compileQuotationHTML';

interface Organization {
  id: number;
  name: string;
}

interface MessageModalProps {
  quote: Quotation;
  isOpen: boolean;
  onClose: () => void;
  organizations: Organization[];
  companySettings: any;
  /** final: Ops-approved proposal (moves the quote to Pending Customer Approval); draft: watermarked NOT APPROVED copy */
  mode?: 'final' | 'draft';
  /** called after a successful send / mark-as-sent, so the list can refresh */
  onSent?: () => void;
}

const money = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function emailText(quote: Quotation, isDraft: boolean) {
  return isDraft
    ? `Dear Team,

As discussed, please find the DRAFT proposal for "${quote.title}" (${quote.quotation_no}) for your review.

Please note: this draft has NOT yet been approved and is subject to change. The approved proposal will follow once our internal review is complete.

Indicative value: ${money(quote.final_quote_value)} (inclusive of GST).

The secure link to view and download the draft is included below.

Best regards,
Forma Apparels Co.`
    : `Dear Team,

Please find our approved proposal for "${quote.title}" (${quote.quotation_no}).

The total contract value is ${money(quote.final_quote_value)} (inclusive of GST). The proposal includes the item details, specifications and delivery timeline.

The secure link to view and download your proposal is included below.

Please review it and let us know if you have any questions or are ready to proceed.

Best regards,
Forma Apparels Co.`;
}

function whatsappText(quote: Quotation, isDraft: boolean, link: string) {
  return isDraft
    ? `Hello *${quote.organizations?.name || 'Customer'}* Team,

Here is the *DRAFT* proposal for *"${quote.title}"* (${quote.quotation_no}) for your review.

*Note:* this draft is *not yet approved* and is subject to change.

Indicative value: *${money(quote.final_quote_value)}* (inclusive of GST).

View the draft here:
${link}

*Forma Apparels Co.*`
    : `Hello *${quote.organizations?.name || 'Customer'}* Team,

Here is our proposal for *"${quote.title}"* (${quote.quotation_no}).

Total contract value: *${money(quote.final_quote_value)}* (inclusive of GST).

View and download your proposal here:
${link}

Please let us know if you have any questions or are ready to proceed!

*Forma Apparels Co.*`;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  quote,
  isOpen,
  onClose,
  organizations,
  companySettings,
  mode = 'final',
  onSent
}) => {
  const isDraft = mode === 'draft';
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!quote) return;
    // Customer's contact email on file (blank if none, so nobody gets mailed by guesswork)
    const org = quote.organizations as any;
    setRecipient(org?.contact_email || org?.email || '');
    setSubject(isDraft
      ? `DRAFT (not approved) - Quotation #${quote.quotation_no} - Forma Apparels`
      : `Quotation Proposal #${quote.quotation_no} - Forma Apparels`);
    setPhone(org?.contact_number || org?.phone || '');
    setBody(emailText(quote, isDraft));
    setChannel('email');
  }, [quote, isDraft]);

  if (!isOpen || !quote) return null;

  const finish = () => { if (onSent) onSent(); else onClose(); };

  const switchToWhatsApp = async () => {
    setChannel('whatsapp');
    let link = '(proposal link unavailable)';
    try {
      const res = await api.post(`/quotations/${quote.id}/share-link`);
      link = res.data?.share_url || link;
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not create the proposal link');
    }
    setBody(whatsappText(quote, isDraft, link));
  };

  const switchToEmail = () => {
    setChannel('email');
    setBody(emailText(quote, isDraft));
  };

  const handleSendMessage = async () => {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all email fields');
      return;
    }

    setIsSendingMessage(true);
    const loadingToast = toast.loading('Sending email...');
    try {
      const res = await api.post(`/quotations/${quote.id}/send-email`, {
        to: recipient.trim(),
        subject: subject.trim(),
        message: body,
        draft: isDraft
      });
      toast.success(res.data?.message || 'Email sent', { id: loadingToast });
      finish();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Email could not be sent', { id: loadingToast });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Records the send on the quote (final: moves it to Pending Customer Approval)
  const recordSent = async (sendChannel: 'whatsapp' | 'manual') => {
    try {
      const res = await api.put(`/quotations/${quote.id}/mark-sent`, { channel: sendChannel, draft: isDraft });
      toast.success(res.data?.message || 'Recorded');
      finish();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not record the send');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      toast.error('Please enter a valid WhatsApp mobile number');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body cannot be empty');
      return;
    }

    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(body)}`;
    const chatWindow = window.open(whatsappUrl, '_blank');
    if (!chatWindow) {
      toast.error('Failed to open WhatsApp window. Please allow popups.');
      return;
    }
    await recordSent('whatsapp');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border border-zinc-200/80 shadow-2xl p-8 flex flex-col space-y-6 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0 right-0" />

        {/* Loading Overlay */}
        {isSendingMessage && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#C82A2B]/10 border-t-[#C82A2B] animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-dashed border-zinc-900/10 border-t-zinc-900 animate-spin [animation-duration:3s]"></div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-900">Sending Email</p>
              <p className="text-[10px] font-bold text-zinc-400">Delivering to {recipient}...</p>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-start pt-1">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              channel === 'email' ? 'bg-[#FFF1F1] text-[#9E1B1D]' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {channel === 'email' ? (
                <Mail size={22} className="animate-pulse" />
              ) : (
                <MessageCircle size={22} className="animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-zinc-900">
                {isDraft ? (channel === 'email' ? 'Send Draft to Customer' : 'Send Draft via WhatsApp') : (channel === 'email' ? 'Send Proposal to Customer' : 'Send Proposal via WhatsApp')}
              </h3>
              <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                {channel === 'email'
                  ? (isDraft ? 'Not approved yet: the customer gets a copy watermarked NOT APPROVED.' : 'Email the approved proposal link to the customer.')
                  : 'Dispatch professional summary directly to customer chat.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-650 transition-colors border border-zinc-150 cursor-pointer"
          >
            <span className="text-sm font-black">&times;</span>
          </button>
        </div>

        {/* Segment Tab Switcher */}
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-150">
          <button
            type="button"
            onClick={switchToEmail}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              channel === 'email'
                ? 'bg-white text-[#C82A2B] shadow-sm border border-zinc-200 font-black'
                : 'text-zinc-400 hover:text-zinc-650 font-bold'
            }`}
          >
            <Mail size={14} />
            Email Channel
          </button>
          <button
            type="button"
            onClick={switchToWhatsApp}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
              channel === 'whatsapp'
                ? 'bg-white text-emerald-600 shadow-sm border border-zinc-200 font-black'
                : 'text-zinc-400 hover:text-zinc-650 font-bold'
            }`}
          >
            <MessageCircle size={14} />
            WhatsApp Chat
          </button>
        </div>

        {/* Modal Body / Inputs */}
        <div className="space-y-4 text-xs font-semibold text-zinc-800">
          {channel === 'email' ? (
            <>
              <div className="space-y-1.5 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Recipient Email address</label>
                <Input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="customer@domain.com"
                  className="bg-zinc-50 border-zinc-200 focus:border-[#C82A2B] rounded-2xl p-4 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Email Subject Heading</label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quotation Proposal Proposal"
                  className="bg-zinc-50 border-zinc-200 focus:border-[#C82A2B] rounded-2xl p-4 font-bold text-xs"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Customer Mobile Number (With Country Code)</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +91 9988776655"
                className="bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-2xl p-4 font-bold text-xs"
              />
            </div>
          )}

          {isDraft && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold leading-relaxed">
              This quote is not yet approved by the BM and Ops team ({quote.status || 'Draft'}). The customer's copy will carry a large <strong>NOT APPROVED</strong> watermark, and the status will not change.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Message Body Content</label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write message details..."
              className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-2xl p-4 font-bold text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/15 transition-all leading-relaxed animate-in fade-in duration-300"
            />
          </div>

          {/* Decorative Vector PDF Attachment Banner */}
          <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                channel === 'email' ? 'bg-[#FFF1F1] text-[#9E1B1D] border-[#C82A2B]/15' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
              }`}>
                <Paperclip size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black text-gray-800">{isDraft ? 'DRAFT ' : ''}Proposal {quote.quotation_no} (secure link)</p>
                <p className="text-[9px] text-zinc-400 font-bold">
                  {channel === 'email'
                    ? 'Added to the email automatically when it is sent'
                    : 'Retrieve & download details dynamically linked in chat.'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 font-black text-[9px] uppercase tracking-wider rounded-lg border ${
              channel === 'email' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-[#FFF1F1] text-[#9E1B1D] border-[#C82A2B]/20'
            }`}>
              {isDraft ? 'Watermarked: NOT APPROVED' : 'Link Included'}
            </span>
          </div>

          {channel === 'whatsapp' && (
            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-800 text-[10px] leading-relaxed font-semibold animate-in fade-in duration-300">
              ⚠️ <strong>Notice:</strong> Standard browser click-to-chat links do not support direct file attachments. Please click the <strong>"Download Proposal PDF"</strong> button on the detail view to save the PDF, and then drag/attach the downloaded file in the WhatsApp window.
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 text-zinc-600 font-black hover:bg-zinc-50 px-5 cursor-pointer"
          >
            Cancel
          </Button>
          {!isDraft && (
            <Button
              variant="outline"
              onClick={() => recordSent('manual')}
              className="rounded-xl border border-zinc-200 text-zinc-700 font-black hover:bg-zinc-50 px-4 flex items-center gap-2 cursor-pointer"
              title="The customer received the proposal another way (in person, printed). Marks it as sent."
            >
              <Handshake size={14} />
              Mark as Handed Over
            </Button>
          )}
          {channel === 'email' ? (
            <Button
              onClick={handleSendMessage}
              className="bg-[#C82A2B] text-white hover:bg-[#A81D1E] rounded-xl font-black px-6 flex items-center gap-2 shadow-md shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Send size={14} />
              {isDraft ? 'Send Draft Email' : 'Send Email'}
            </Button>
          ) : (
            <Button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black px-6 flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              <MessageCircle size={14} />
              Open WhatsApp Chat
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};
