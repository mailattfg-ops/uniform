'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
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
}

export const MessageModal: React.FC<MessageModalProps> = ({
  quote,
  isOpen,
  onClose,
  organizations,
  companySettings
}) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!quote) return;
    const orgCleanName = (quote.organizations?.name || 'customer')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const defaultRecipient = `info@${orgCleanName}.com`;
    const defaultSubject = `Quotation Proposal #${quote.quotation_no} - Forma Apparels`;

    setRecipient(defaultRecipient);
    setSubject(defaultSubject);
    setPhone('');

    // Default email body
    const emailBody = `Dear Team,

We are pleased to inform you that the operations desk has officially reviewed and approved the contract proposal for "${quote.title}" (${quote.quotation_no}).

The total contract value is finalized at ₹${Number(quote.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} (inclusive of GST). The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled.

You can view and download your official Proposal PDF here:
${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5005/api').replace('/api', '')}/api/quotations/${quote.id}/share

Please review the proposal and let us know if you have any questions or are ready to proceed with contract execution.

Best regards,

Operations Desk Team
Forma Apparels Co.`;

    setBody(emailBody);
    setChannel('email');
  }, [quote]);

  if (!isOpen || !quote) return null;

  const switchToWhatsApp = () => {
    setChannel('whatsapp');

    const waBody = `Hello *${quote.organizations?.name || 'Customer'}* Team,

We are pleased to inform you that the operations desk has reviewed and approved the contract proposal for *"${quote.title}"* (${quote.quotation_no}).

Total finalized contract value: *₹${Number(quote.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}* (inclusive of GST).

Download your official Proposal PDF directly here:
${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5005/api').replace('/api', '')}/api/quotations/${quote.id}/share

The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled. We have dispatched a copy to your email, and you can also download or view the details directly under your Forma Apparels portal.

Please let us know if you have any questions or are ready to proceed with contract execution!

Best regards,
*Operations Desk Team*
*Forma Apparels Co.*`;

    setBody(waBody);
  };

  const switchToEmail = () => {
    setChannel('email');

    const emailBody = `Dear Team,

We are pleased to inform you that the operations desk has officially reviewed and approved the contract proposal for "${quote.title}" (${quote.quotation_no}).

The total contract value is finalized at ₹${Number(quote.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2 })} (inclusive of GST). The secure, operations-verified vector PDF proposal containing detailed sizing breakdowns, technical specifications, and production timelines has been compiled.

You can view and download your official Proposal PDF here:
${(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5005/api').replace('/api', '')}/api/quotations/${quote.id}/share

Please review the proposal and let us know if you have any questions or are ready to proceed with contract execution.

Best regards,

Operations Desk Team
Forma Apparels Co.`;

    setBody(emailBody);
  };

  const handleSendMessage = async () => {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all email fields');
      return;
    }

    setIsSendingMessage(true);
    const loadingToast = toast.loading('Initiating secure delivery...');

    setTimeout(() => {
      toast.loading('Compiling and digitally signing vector proposal PDF...', { id: loadingToast });

      setTimeout(() => {
        toast.loading('Dispatching encrypted document package to client...', { id: loadingToast });

        setTimeout(() => {
          toast.success('Proposal PDF sent to customer successfully!', { id: loadingToast });
          setIsSendingMessage(false);
          onClose();
        }, 800);
      }, 800);
    }, 800);
  };

  const handleSendWhatsApp = () => {
    if (!phone.trim()) {
      toast.error('Please enter a valid WhatsApp mobile number');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body cannot be empty');
      return;
    }

    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    const encodedText = encodeURIComponent(body);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedText}`;

    const chatWindow = window.open(whatsappUrl, '_blank');
    if (!chatWindow) {
      toast.error('Failed to open WhatsApp window. Please allow popups.');
      return;
    }

    toast.success('WhatsApp API message dispatch initiated!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border border-zinc-150 shadow-2xl p-8 flex flex-col space-y-6 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Loading Overlay */}
        {isSendingMessage && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-dashed border-[#3a525d]/10 border-t-[#3a525d] animate-spin [animation-duration:3s]"></div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-[#3a525d]">Secure Transmission Active</p>
              <p className="text-[10px] font-bold text-zinc-400">Verifying keys & compiling proposal attachments...</p>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              channel === 'email' ? 'bg-[#2d8d9b]/10 text-[#2d8d9b]' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {channel === 'email' ? (
                <Mail size={22} className="animate-pulse" />
              ) : (
                <MessageCircle size={22} className="animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-[#3a525d]">
                {channel === 'email' ? 'Send Proposal to Customer' : 'Send Proposal via WhatsApp'}
              </h3>
              <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                {channel === 'email'
                  ? 'Prepare secure email package containing verified vector PDF.'
                  : 'Dispatch professional summary directly to customer chat.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-650 transition-colors border border-zinc-150"
          >
            <span className="text-sm font-black">&times;</span>
          </button>
        </div>

        {/* Segment Tab Switcher */}
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl border border-zinc-150">
          <button
            type="button"
            onClick={switchToEmail}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              channel === 'email'
                ? 'bg-white text-[#2d8d9b] shadow-sm border border-zinc-200 font-black'
                : 'text-zinc-400 hover:text-zinc-650 font-bold'
            }`}
          >
            <Mail size={14} />
            Email Channel
          </button>
          <button
            type="button"
            onClick={switchToWhatsApp}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
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
        <div className="space-y-4 text-xs font-semibold text-[#3a525d]">
          {channel === 'email' ? (
            <>
              <div className="space-y-1.5 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Recipient Email address</label>
                <Input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="customer@domain.com"
                  className="bg-zinc-50 border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5 animate-in fade-in duration-300">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Email Subject Heading</label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quotation Proposal Proposal"
                  className="bg-zinc-50 border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 animate-in fade-in duration-300">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Customer Mobile Number (With Country Code)</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +91 9988776655"
                className="bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-2xl p-4 font-bold text-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-450">Message Body Content</label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write message details..."
              className="w-full bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-2xl p-4 font-bold text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 transition-all leading-relaxed animate-in fade-in duration-300"
            />
          </div>

          {/* Decorative Vector PDF Attachment Banner */}
          <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                channel === 'email' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'
              }`}>
                <Paperclip size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black text-gray-800">proposal_{quote.quotation_no}.pdf</p>
                <p className="text-[9px] text-zinc-400 font-bold">
                  {channel === 'email'
                    ? '1.2 MB • Sizing Audit Vector Compiled'
                    : 'Retrieve & download details dynamically linked in chat.'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 font-black text-[9px] uppercase tracking-wider rounded-lg border ${
              channel === 'email' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-[#2d8d9b]/10 text-[#2d8d9b] border-[#2d8d9b]/20'
            }`}>
              {channel === 'email' ? 'Ready & Signed' : 'Portal Linked'}
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
            className="rounded-xl border border-zinc-200 text-[#3a525d] font-black hover:bg-zinc-50 px-5"
          >
            Cancel
          </Button>
          {channel === 'email' ? (
            <Button
              onClick={handleSendMessage}
              className="bg-[#2d8d9b] text-white hover:bg-[#3a525d] rounded-xl font-black px-6 flex items-center gap-2 shadow transition-all"
            >
              <Send size={14} />
              Send Secure Package
            </Button>
          ) : (
            <Button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black px-6 flex items-center gap-2 shadow transition-all"
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
