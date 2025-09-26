import React, { useState } from 'react';
import { Post, User } from '../types';
import Icon from './Icon';

interface LeadFormModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onSubmit: (leadData: { name: string; email: string; phone: string }) => Promise<void>;
}

const LeadFormModal: React.FC<LeadFormModalProps> = ({ post, currentUser, onClose, onSubmit }) => {
    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        setIsSubmitting(true);
        await onSubmit({ name, email, phone });
        // The parent component will close the modal on success.
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center text-white p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors" aria-label="Close lead form">
                    <Icon name="close" className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <img src={post.author.avatarUrl} alt={post.sponsorName} className="w-16 h-16 rounded-full mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-100">Connect with {post.sponsorName}</h2>
                    <p className="text-slate-400 mt-2 mb-6">Confirm your details below and {post.sponsorName} will get in touch with you.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="lead-name" className="block mb-2 text-sm font-medium text-slate-300">Full Name</label>
                        <input
                            type="text"
                            id="lead-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-rose-500 focus:border-rose-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="lead-email" className="block mb-2 text-sm font-medium text-slate-300">Email Address</label>
                        <input
                            type="email"
                            id="lead-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-rose-500 focus:border-rose-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="lead-phone" className="block mb-2 text-sm font-medium text-slate-300">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            id="lead-phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-rose-500 focus:border-rose-500"
                        />
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                        >
                            {isSubmitting ? 'Submitting...' : 'Send My Info'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadFormModal;
