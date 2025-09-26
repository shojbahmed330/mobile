
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Campaign, Lead } from '../types';
import { firebaseService } from '../services/firebaseService';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { SPONSOR_CPM_BDT } from '../constants';
import PaymentModal from './PaymentModal';

interface AdsScreenProps {
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  onGoBack: () => void;
}

type MediaType = 'image' | 'video' | 'audio';
type CtaType = 'website' | 'message' | 'lead_form';

const StatCard: React.FC<{ title: string, value: string, iconName: React.ComponentProps<typeof Icon>['name'], color: string }> = ({ title, value, iconName, color }) => (
    <div className="bg-slate-800 p-4 rounded-lg flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon name={iconName} className="w-6 h-6 text-white"/>
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-xl font-bold text-slate-100">{value}</p>
        </div>
    </div>
);

const AdsScreen: React.FC<AdsScreenProps> = ({ currentUser, onSetTtsMessage, lastCommand, onCommandProcessed, onGoBack }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [sponsorName, setSponsorName] = useState(currentUser.name);
    const [caption, setCaption] = useState('');
    const [budget, setBudget] = useState<number | string>('');
    const [mediaType, setMediaType] = useState<MediaType>('image');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
    const [ctaType, setCtaType] = useState<CtaType>('website');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adType, setAdType] = useState<'feed' | 'story'>('feed');

    // Targeting state
    const [location, setLocation] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'All'>('All');
    const [ageRange, setAgeRange] = useState('All');
    const [interests, setInterests] = useState('');


    // Payment flow state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [pendingCampaignData, setPendingCampaignData] = useState<Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'> | null>(null);
    
    // Leads view state
    const [viewingLeadsFor, setViewingLeadsFor] = useState<string | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);


    const fetchCampaigns = useCallback(async () => {
        setIsLoading(true);
        const fetchedCampaigns = await geminiService.getCampaignsForSponsor(currentUser.id);
        setCampaigns(fetchedCampaigns);
        setIsLoading(false);
    }, [currentUser.id]);

    useEffect(() => {
        onSetTtsMessage("Welcome to the Ads Center. Say 'create a new campaign' or 'show my campaigns'.");
        fetchCampaigns();
    }, [onSetTtsMessage, fetchCampaigns]);
    
    const handleCommand = useCallback(async (command: string) => {
        try {
            const intentResponse = await geminiService.processIntent(command);
            const { intent, slots } = intentResponse;

            switch (intent) {
                case 'intent_go_back':
                    onGoBack();
                    break;
                case 'intent_create_campaign':
                    setActiveTab('create');
                    onSetTtsMessage("Okay, let's create a new campaign. You can say 'set sponsor name', 'set budget', 'set caption', or 'set media type'.");
                    break;
                case 'intent_view_campaign_dashboard':
                    setActiveTab('dashboard');
                    onSetTtsMessage("Viewing your campaign dashboard.");
                    break;
                case 'intent_set_sponsor_name':
                    if (slots?.sponsor_name && typeof slots.sponsor_name === 'string') {
                        setSponsorName(slots.sponsor_name);
                        onSetTtsMessage(`Sponsor name set to: ${slots.sponsor_name}`);
                    }
                    break;
                case 'intent_set_campaign_caption':
                    if (slots?.caption_text && typeof slots.caption_text === 'string') {
                        setCaption(slots.caption_text);
                        onSetTtsMessage(`Campaign caption has been set.`);
                    }
                    break;
                case 'intent_set_campaign_budget':
                     if (slots?.budget_amount) {
                        const newBudget = String(slots.budget_amount).replace(/[^0-9]/g, '');
                        setBudget(newBudget);
                        onSetTtsMessage(`Budget set to ${newBudget} Taka.`);
                    }
                    break;
                case 'intent_set_media_type':
                    const newType = slots?.media_type as MediaType;
                    if (newType && ['image', 'video', 'audio'].includes(newType)) {
                        setMediaType(newType);
                        onSetTtsMessage(`Media type set to ${newType}. Please click to upload the file manually.`);
                    }
                    break;
                case 'intent_launch_campaign':
                     onSetTtsMessage("Attempting to launch the campaign...");
                     submitButtonRef.current?.click();
                     break;
            }
        } catch (error) {
            console.error("Error processing command in AdsScreen:", error);
        } finally {
            onCommandProcessed();
        }
    }, [onSetTtsMessage, onCommandProcessed, onGoBack]);

    useEffect(() => {
        if(lastCommand) {
            handleCommand(lastCommand);
        }
    }, [lastCommand, handleCommand]);

    const resetForm = () => {
        setSponsorName(currentUser.name);
        setCaption('');
        setBudget('');
        setMediaType('image');
        setMediaFile(null);
        if(mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
        setMediaPreviewUrl(null);
        setCtaType('website');
        setWebsiteUrl('');
        setAdType('feed');
        setLocation('');
        setGender('All');
        setAgeRange('All');
        setInterests('');
        if(fileInputRef.current) fileInputRef.current.value = '';
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
            setMediaPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleProceedToPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sponsorName || !caption || !mediaPreviewUrl || !budget) {
            onSetTtsMessage("Please fill out all fields and upload a media file before launching.");
            alert("Please fill out all fields and upload a media file.");
            return;
        }
        
        const campaignData: Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'> = {
            sponsorId: currentUser.id,
            sponsorName,
            caption,
            budget: Number(budget),
            imageUrl: mediaType === 'image' ? mediaPreviewUrl : undefined,
            audioUrl: mediaType === 'audio' ? mediaPreviewUrl : undefined,
            videoUrl: mediaType === 'video' ? mediaPreviewUrl : undefined,
            websiteUrl: ctaType === 'website' ? websiteUrl : undefined,
            allowDirectMessage: ctaType === 'message',
            allowLeadForm: ctaType === 'lead_form',
            createdAt: new Date().toISOString(),
            paymentStatus: 'pending',
            adType: adType,
            targeting: {
                location: location.trim() || undefined,
                gender: gender,
                ageRange: ageRange !== 'All' ? ageRange : undefined,
                interests: interests.split(',').map(i => i.trim()).filter(Boolean)
            }
        };
        
        setPendingCampaignData(campaignData);
        setIsPaymentModalOpen(true);
        onSetTtsMessage(`Proceeding to payment for ৳${budget}. Please complete the transaction.`);
    }

    const handlePaymentSubmit = async (transactionId: string) => {
        if (!pendingCampaignData) return;
        
        setIsPaymentModalOpen(false);
        setIsSubmitting(true);
        onSetTtsMessage("Submitting your campaign for verification...");
        
        await geminiService.submitCampaignForApproval(pendingCampaignData, transactionId);
        
        setIsSubmitting(false);
        setPendingCampaignData(null);
        resetForm();
        await fetchCampaigns();
        setActiveTab('dashboard');
        onSetTtsMessage("Your campaign has been submitted for approval. You will receive a notification shortly.");
    };

    const handleViewLeads = async (campaignId: string) => {
        if (viewingLeadsFor === campaignId) {
            setViewingLeadsFor(null); // Toggle off
            return;
        }
        setIsLoadingLeads(true);
        setViewingLeadsFor(campaignId);
        const fetchedLeads = await firebaseService.getLeadsForCampaign(campaignId);
        setLeads(fetchedLeads);
        setIsLoadingLeads(false);
    };

    const getStatusStyles = (status: Campaign['status']) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400';
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400';
            case 'finished':
                return 'bg-slate-500/20 text-slate-400';
            case 'rejected':
                return 'bg-red-500/20 text-red-400';
        }
    }

    const renderDashboard = () => {
        if (isLoading) return <p className="text-slate-400">Loading campaigns...</p>;
        if (campaigns.length === 0) {
            return (
                <div className="text-center py-12">
                    <Icon name="briefcase" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-300">No campaigns yet</h3>
                    <p className="text-slate-400 mt-2">Say or click 'Create New Campaign' to get started.</p>
                </div>
            )
        }
        return (
            <div className="space-y-6">
                {campaigns.map(campaign => {
                    const costSoFar = (campaign.views / 1000) * SPONSOR_CPM_BDT;
                    const budgetRemaining = campaign.budget - costSoFar;
                    const mediaUrl = campaign.videoUrl || campaign.imageUrl || campaign.audioUrl;

                    return (
                        <div key={campaign.id} className="bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row gap-4">
                                    {mediaUrl && (
                                        <div className="w-full md:w-40 h-40 bg-slate-700 rounded-md flex-shrink-0">
                                            {campaign.videoUrl ? (
                                                <video src={mediaUrl} muted loop className="w-full h-full object-cover rounded-md"/>
                                            ) : campaign.imageUrl ? (
                                                 <img src={mediaUrl} alt={campaign.sponsorName} className="w-full h-full object-cover rounded-md" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Icon name="speaker-wave" className="w-12 h-12 text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-100">{campaign.sponsorName}</h3>
                                                <p className="text-slate-400 mt-1">{campaign.caption}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusStyles(campaign.status)}`}>
                                                {campaign.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                            <StatCard title="Impressions" value={campaign.views.toLocaleString()} iconName="users" color="bg-sky-500/80"/>
                                            <StatCard title="Clicks" value={campaign.clicks.toLocaleString()} iconName="logo" color="bg-lime-500/80"/>
                                            <StatCard title="Budget" value={`৳${campaign.budget.toLocaleString()}`} iconName="coin" color="bg-emerald-500/80"/>
                                            <StatCard title="Budget Left" value={`৳${Math.max(0, budgetRemaining).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} iconName="coin" color="bg-yellow-500/80"/>
                                        </div>
                                    </div>
                                </div>
                                {campaign.allowLeadForm && (
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <button
                                        onClick={() => handleViewLeads(campaign.id)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                                    >
                                        {viewingLeadsFor === campaign.id ? 'Hide Leads' : 'View Leads'}
                                    </button>
                                </div>
                              )}
                            </div>
                             {viewingLeadsFor === campaign.id && (
                                <div className="bg-slate-900/50 p-4 border-t border-slate-700">
                                    <h4 className="font-bold text-lg text-slate-200 mb-3">Collected Leads</h4>
                                    {isLoadingLeads ? <p>Loading leads...</p> : leads.length === 0 ? <p>No leads collected yet.</p> : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm text-left text-slate-300">
                                                <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-2">Date</th>
                                                        <th scope="col" className="px-4 py-2">Name</th>
                                                        <th scope="col" className="px-4 py-2">Email</th>
                                                        <th scope="col" className="px-4 py-2">Phone</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {leads.map(lead => (
                                                        <tr key={lead.id} className="border-b border-slate-700">
                                                            <td className="px-4 py-2">{new Date(lead.createdAt).toLocaleDateString()}</td>
                                                            <td className="px-4 py-2 font-medium text-slate-100">{lead.userName}</td>
                                                            <td className="px-4 py-2">{lead.userEmail}</td>
                                                            <td className="px-4 py-2">{lead.userPhone || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    };

    const renderCreateForm = () => (
        <form onSubmit={handleProceedToPayment} className="space-y-6 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            {/* --- Basic Info --- */}
            <fieldset className="space-y-4">
                <legend className="text-xl font-semibold text-lime-400 mb-2">1. Basic Information</legend>
                <div>
                    <label htmlFor="sponsorName" className="block mb-2 text-sm font-medium text-slate-300">Sponsor/Brand Name</label>
                    <input type="text" id="sponsorName" value={sponsorName} onChange={e => setSponsorName(e.target.value)} required className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5 transition" />
                </div>
                <div>
                    <label htmlFor="caption" className="block mb-2 text-sm font-medium text-slate-300">Ad Caption</label>
                    <textarea id="caption" value={caption} onChange={e => setCaption(e.target.value)} required rows={3} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5 transition"></textarea>
                </div>
            </fieldset>

            {/* --- Ad Format & Media --- */}
            <fieldset className="space-y-4 border-t border-slate-700 pt-6">
                <legend className="text-xl font-semibold text-lime-400 mb-2">2. Ad Format & Media</legend>
                <div>
                    <label className="block mb-2 text-sm font-medium text-slate-300">Ad Placement</label>
                    <div className="flex gap-4">
                        {(['feed', 'story'] as const).map(type => (
                            <label key={type} className="flex items-center gap-2 text-slate-200">
                                <input type="radio" name="adType" value={type} checked={adType === type} onChange={() => setAdType(type)} className="w-4 h-4 text-lime-600" />
                                <span className="capitalize">{type} Ad</span>
                            </label>
                        ))}
                    </div>
                    {adType === 'story' && <p className="text-xs text-slate-400 mt-1">Note: For Story ads, please upload a vertical video or image (9:16 aspect ratio).</p>}
                </div>
                <div>
                    <label htmlFor="mediaFile" className="block mb-2 text-sm font-medium text-slate-300">Upload Media</label>
                    <input ref={fileInputRef} type="file" id="mediaFile" onChange={handleFileChange} accept="image/*,video/*,audio/*" required className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100"/>
                </div>
                 {mediaPreviewUrl && (
                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-300">Preview</label>
                        <div className="bg-slate-700 rounded-lg p-2 flex items-center justify-center h-48">
                            {mediaFile?.type.startsWith('image') && <img src={mediaPreviewUrl} className="max-h-full max-w-full object-contain" alt="Preview"/>}
                            {mediaFile?.type.startsWith('video') && <video src={mediaPreviewUrl} controls className="max-h-full max-w-full" />}
                            {mediaFile?.type.startsWith('audio') && <audio src={mediaPreviewUrl} controls />}
                        </div>
                    </div>
                )}
            </fieldset>

            {/* --- Targeting --- */}
            <fieldset className="space-y-4 border-t border-slate-700 pt-6">
                 <legend className="text-xl font-semibold text-lime-400 mb-2">3. Targeting (Optional)</legend>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="location" className="block mb-2 text-sm font-medium text-slate-300">Location</label>
                        <input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Dhaka, Bangladesh" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                    </div>
                     <div>
                        <label htmlFor="gender" className="block mb-2 text-sm font-medium text-slate-300">Gender</label>
                        <select id="gender" value={gender} onChange={e => setGender(e.target.value as any)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5">
                            <option>All</option>
                            <option>Male</option>
                            <option>Female</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="ageRange" className="block mb-2 text-sm font-medium text-slate-300">Age Range</label>
                        <select id="ageRange" value={ageRange} onChange={e => setAgeRange(e.target.value)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5">
                            <option>All</option>
                            <option>18-25</option>
                            <option>26-35</option>
                            <option>36-50</option>
                            <option>50+</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="interests" className="block mb-2 text-sm font-medium text-slate-300">Interests</label>
                        <input type="text" id="interests" value={interests} onChange={e => setInterests(e.target.value)} placeholder="e.g., music, food, gaming" className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                        <p className="text-xs text-slate-400 mt-1">Comma-separated interests.</p>
                    </div>
                 </div>
            </fieldset>


            {/* --- Budget & CTA --- */}
            <fieldset className="space-y-4 border-t border-slate-700 pt-6">
                <legend className="text-xl font-semibold text-lime-400 mb-2">4. Budget & Goal</legend>
                 <div>
                    <label htmlFor="budget" className="block mb-2 text-sm font-medium text-slate-300">Total Budget (in BDT)</label>
                    <input type="number" id="budget" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g., 5000" min="500" required className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                    <p className="text-xs text-slate-400 mt-2">Based on a CPM of ৳{SPONSOR_CPM_BDT}, this budget will give you approximately {Number(budget) > 0 ? Math.floor((Number(budget) / SPONSOR_CPM_BDT) * 1000).toLocaleString() : 0} views.</p>
                </div>
                <div>
                    <h3 className="text-base font-medium text-slate-300 mb-2">Call To Action</h3>
                    {/* CTA options here */}
                     <div className="space-y-3">
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="ctaType" value="website" checked={ctaType === 'website'} onChange={() => setCtaType('website')} className="w-5 h-5 text-lime-600"/>
                                <div>
                                    <span className="font-medium text-slate-200">Link to Website</span>
                                    <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} disabled={ctaType !== 'website'} placeholder="https://example.com" className="bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-lg block w-full p-2.5 mt-2 transition disabled:opacity-50" />
                                </div>
                            </label>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="ctaType" value="message" checked={ctaType === 'message'} onChange={() => setCtaType('message')} className="w-5 h-5 text-lime-600"/>
                                <span className="font-medium text-slate-200">Allow Direct Messages</span>
                            </label>
                        </div>
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="ctaType" value="lead_form" checked={ctaType === 'lead_form'} onChange={() => setCtaType('lead_form')} className="w-5 h-5 text-lime-600"/>
                                <div>
                                <span className="font-medium text-slate-200">Collect Leads with a Form</span>
                                <p className="text-xs text-slate-400 mt-1">Users can submit their name, email, and phone number directly in the app.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end pt-4">
                 <button ref={submitButtonRef} type="submit" disabled={isSubmitting || !budget} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                    {isSubmitting ? 'Submitting...' : `Proceed to Payment (৳${Number(budget || 0).toLocaleString()})`}
                </button>
            </div>
        </form>
    );

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4 text-slate-100">Ads Center</h1>
                <p className="text-slate-400 mb-8">Create and manage your ad campaigns on VoiceBook.</p>
                
                <div className="border-b border-slate-700 flex items-center mb-6">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === 'dashboard' ? 'border-lime-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                        Dashboard
                    </button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === 'create' ? 'border-lime-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                        Create New Campaign
                    </button>
                </div>

                {activeTab === 'dashboard' ? renderDashboard() : renderCreateForm()}
            </div>
            
            {isPaymentModalOpen && pendingCampaignData && (
                <PaymentModal
                    amount={pendingCampaignData.budget}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        setPendingCampaignData(null);
                        onSetTtsMessage("Payment cancelled.");
                    }}
                    onPaymentSubmit={handlePaymentSubmit}
                />
            )}
        </div>
    )
};

export default AdsScreen;
