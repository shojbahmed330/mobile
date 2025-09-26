import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

const AdminAnnouncementScreen: React.FC = () => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSend = async () => {
        if (!message.trim()) {
            setFeedback({ type: 'error', message: 'Announcement message cannot be empty.' });
            return;
        }

        if (!window.confirm("Are you sure you want to send this announcement to ALL users? This action cannot be undone.")) {
            return;
        }

        setIsSending(true);
        setFeedback(null);

        const success = await geminiService.sendSiteWideAnnouncement(message.trim());

        setIsSending(false);
        if (success) {
            setFeedback({ type: 'success', message: 'Announcement sent successfully to all users!' });
            setMessage('');
        } else {
            setFeedback({ type: 'error', message: 'Failed to send announcement. Please try again.' });
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">Site-Wide Announcement</h1>
                <p className="text-slate-400 mb-8">Send a notification to every user on the platform. Use this for important updates or maintenance notices.</p>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-4">
                    <div>
                        <label htmlFor="announcement-message" className="block mb-2 text-sm font-medium text-slate-300">
                            Announcement Message
                        </label>
                        <textarea
                            id="announcement-message"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Example: The platform will be down for scheduled maintenance tonight from 2:00 AM to 2:30 AM."
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-rose-500 focus:border-rose-500 resize-y"
                        />
                    </div>

                    {feedback && (
                        <p className={`text-sm ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {feedback.message}
                        </p>
                    )}

                    <div className="flex justify-end">
                        <button
                            onClick={handleSend}
                            disabled={isSending || !message.trim()}
                            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg flex items-center gap-2"
                        >
                            {isSending ? (
                                <>
                                    <Icon name="logo" className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Icon name="speaker-wave" className="w-5 h-5" />
                                    Send to All Users
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnnouncementScreen;
