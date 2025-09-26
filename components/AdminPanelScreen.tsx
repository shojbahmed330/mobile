

import React, { useState, useEffect, useCallback } from 'react';
import { User, Campaign } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface AdminPanelScreenProps {
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
}

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ currentUser, onSetTtsMessage, lastCommand }) => {
    const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

    const fetchPendingCampaigns = useCallback(async () => {
        setIsLoading(true);
        const campaigns = await geminiService.getPendingCampaigns();
        setPendingCampaigns(campaigns);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        onSetTtsMessage("Admin panel loaded. Review pending campaigns below.");
        fetchPendingCampaigns();
    }, [onSetTtsMessage, fetchPendingCampaigns]);

    const handleApprove = async (campaignId: string) => {
        await geminiService.approveCampaign(campaignId);
        onSetTtsMessage("Campaign approved and is now active.");
        fetchPendingCampaigns(); // Refresh the list
    };
    
    const handleReject = async (campaignId: string) => {
        const reason = rejectionReasons[campaignId];
        if (!reason || reason.trim() === '') {
            alert('Please provide a reason for rejection.');
            onSetTtsMessage("Rejection failed. Please provide a reason.");
            return;
        }
        await geminiService.rejectCampaign(campaignId, reason);
        onSetTtsMessage("Campaign has been rejected. The user will be notified.");
        fetchPendingCampaigns(); // Refresh the list
    };

    if (currentUser.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-full text-center text-white p-4">
                <div>
                    <Icon name="lock-closed" className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-slate-400 mt-2">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }
    
    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading pending campaigns...</p>;
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">Admin Panel</h1>
                <p className="text-slate-400 mb-8">Review and approve pending campaigns.</p>

                 {pendingCampaigns.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg">
                        <Icon name="briefcase" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">No Pending Campaigns</h3>
                        <p className="text-slate-400 mt-2">All campaigns are up to date.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {pendingCampaigns.map(campaign => {
                            const mediaUrl = campaign.videoUrl || campaign.imageUrl || campaign.audioUrl;
                            return (
                                <div key={campaign.id} className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
                                    <div className="flex flex-col md:flex-row gap-5">
                                        {mediaUrl && (
                                            <div className="w-full md:w-52 h-52 bg-slate-700 rounded-md flex-shrink-0">
                                                {campaign.videoUrl ? (
                                                    <video src={mediaUrl} controls className="w-full h-full object-cover rounded-md"/>
                                                ) : campaign.imageUrl ? (
                                                    <img src={mediaUrl} alt={campaign.sponsorName} className="w-full h-full object-cover rounded-md" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center p-4">
                                                        <audio src={mediaUrl} controls className="w-full"/>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-bold text-slate-100">{campaign.sponsorName}</h3>
                                            <p className="text-slate-300 mt-1">{campaign.caption}</p>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                                                <div className="bg-slate-700/50 p-3 rounded-lg">
                                                    <p className="text-slate-400 font-semibold">Sponsor ID</p>
                                                    <p className="text-slate-200 font-mono">{campaign.sponsorId}</p>
                                                </div>
                                                <div className="bg-slate-700/50 p-3 rounded-lg">
                                                    <p className="text-slate-400 font-semibold">Budget</p>
                                                    <p className="text-slate-200 font-mono">৳{campaign.budget.toLocaleString()}</p>
                                                </div>
                                                 <div className="bg-slate-900/70 p-3 rounded-lg col-span-1 sm:col-span-2">
                                                    <p className="text-rose-400 font-semibold">Transaction ID (TrxID)</p>
                                                    <p className="text-white font-bold text-lg font-mono">{campaign.transactionId}</p>
                                                </div>
                                            </div>
                                        </div>
                                         <div className="w-full md:w-64 flex-shrink-0 space-y-3">
                                            <button 
                                                onClick={() => handleApprove(campaign.id)}
                                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                                            >
                                                Approve
                                            </button>
                                            <div className="space-y-2">
                                                <input 
                                                    type="text"
                                                    placeholder="Reason for rejection..."
                                                    value={rejectionReasons[campaign.id] || ''}
                                                    onChange={e => setRejectionReasons(prev => ({ ...prev, [campaign.id]: e.target.value }))}
                                                    className="bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-full p-2 transition"
                                                />
                                                <button 
                                                    onClick={() => handleReject(campaign.id)}
                                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanelScreen;