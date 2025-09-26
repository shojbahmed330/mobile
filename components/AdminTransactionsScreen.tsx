import React, { useState, useEffect, useCallback } from 'react';
import { Campaign, AdminUser } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface AdminTransactionsScreenProps {
    adminUser: AdminUser;
}

const StatusBadge: React.FC<{ status: Campaign['paymentStatus'] }> = ({ status }) => {
    const styles = {
        pending: 'bg-yellow-500/20 text-yellow-300',
        verified: 'bg-green-500/20 text-green-400',
        failed: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${styles[status || 'pending']}`}>
            {status || 'pending'}
        </span>
    );
};

const AdminTransactionsScreen: React.FC<AdminTransactionsScreenProps> = ({ adminUser }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending'>('pending');

    const fetchCampaigns = useCallback(async () => {
        setIsLoading(true);
        const allCampaigns = await geminiService.getAllCampaignsForAdmin();
        setCampaigns(allCampaigns);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);
    
    const handleVerify = async (campaignId: string) => {
        const success = await geminiService.verifyCampaignPayment(campaignId, adminUser.id);
        if (success) {
            fetchCampaigns(); // Refresh list
        } else {
            alert('Failed to verify payment. Please check the console and try again.');
        }
    };

    const filteredCampaigns = campaigns.filter(c => {
        if (filter === 'pending') {
            return c.paymentStatus === 'pending';
        }
        return true;
    });

    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading transaction log...</p>;
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">Transaction Log</h1>
                <p className="text-slate-400 mb-6">Verify payments submitted for ad campaigns.</p>
                
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'pending' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Pending</button>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-md text-sm font-semibold ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>All</button>
                </div>

                <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead className="bg-slate-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Sponsor</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">TrxID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                                {filteredCampaigns.length > 0 ? filteredCampaigns.map(c => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">{c.sponsorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{new Date(c.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-200">৳{c.budget.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-rose-300">{c.transactionId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={c.paymentStatus} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {c.paymentStatus === 'pending' ? (
                                                <button onClick={() => handleVerify(c.id)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 px-3 rounded-md transition-colors text-xs">Verify</button>
                                            ) : (
                                                <span className="text-xs text-slate-500">Verified by {c.paymentVerifiedBy?.substring(0, 5)}...</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No transactions found for this filter.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminTransactionsScreen;
