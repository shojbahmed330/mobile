

import React, { useState } from 'react';
import Icon from './Icon';

interface PaymentModalProps {
  amount: number;
  onClose: () => void;
  onPaymentSubmit: (transactionId: string) => void;
}

type PaymentStep = 'instructions' | 'enter_trxid' | 'pending';

const PaymentModal: React.FC<PaymentModalProps> = ({ amount, onClose, onPaymentSubmit }) => {
    const [step, setStep] = useState<PaymentStep>('instructions');
    const [trxId, setTrxId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!trxId.trim()) {
            alert("Please enter a valid Transaction ID.");
            return;
        }
        setIsSubmitting(true);
        setStep('pending');

        setTimeout(() => {
            onPaymentSubmit(trxId);
            // The modal will be closed by the parent component after this handler.
        }, 3000); // Give user time to read the pending message
    };
    
    const renderInstructions = () => (
        <>
            <h2 className="text-3xl font-bold text-center mb-2">Payment Instructions</h2>
            <p className="text-center text-slate-300 mb-6">
                Please send <strong className="text-rose-400">৳{amount.toLocaleString()}</strong> to the following Merchant number and enter the Transaction ID (TrxID) below.
            </p>
            <div className="bg-slate-900/50 p-4 rounded-lg text-center my-6">
                <p className="text-sm text-slate-400">bKash / Nagad Merchant Number</p>
                <p className="text-3xl font-bold text-white tracking-widest">01721-013902</p>
            </div>
            <button
                onClick={() => setStep('enter_trxid')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
                I Have Paid, Enter TrxID
            </button>
        </>
    );

    const renderTrxIdInput = () => (
         <>
            <h2 className="text-3xl font-bold text-center mb-4">Enter Transaction ID</h2>
            <p className="text-center text-slate-400 mb-6">
                Enter the Transaction ID (TrxID) you received from bKash/Nagad via SMS.
            </p>
            <div>
                <label htmlFor="trxId" className="block mb-2 text-sm font-medium text-slate-300">Transaction ID (TrxID)</label>
                <input 
                    type="text" 
                    id="trxId" 
                    value={trxId}
                    onChange={e => setTrxId(e.target.value.toUpperCase())}
                    placeholder="e.g., 9M7X3A4B2C"
                    required 
                    className="bg-slate-700 border border-slate-600 text-slate-100 text-lg tracking-wider text-center rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" 
                />
            </div>
             <div className="flex gap-4 mt-8">
                <button
                    onClick={() => setStep('instructions')}
                    className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!trxId.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                >
                    Submit for Verification
                </button>
            </div>
        </>
    );

    const renderPending = () => (
        <div className="text-center py-10">
            <Icon name="logo" className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4"/>
            <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
            <p className="text-slate-300">
                Thank you! Your transaction is being manually verified. This may take up to 5 minutes. You will receive a notification once your campaign is approved.
            </p>
        </div>
    );

    const renderContent = () => {
        switch (step) {
            case 'instructions':
                return renderInstructions();
            case 'enter_trxid':
                return renderTrxIdInput();
            case 'pending':
                return renderPending();
            default:
                return null;
        }
    }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center text-white p-4 animate-fade-in-fast" onClick={!isSubmitting ? onClose : undefined}>
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        {!isSubmitting && (
            <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors" aria-label="Close payment modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentModal;