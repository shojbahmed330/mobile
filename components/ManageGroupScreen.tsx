
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView, Group, Post, User } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

type ActiveTab = 'members' | 'requests' | 'posts' | 'settings';

interface MemberManagementCardProps {
    member: User;
    group: Group;
    currentUser: User;
    onAction: () => void;
    onSetTtsMessage: (message: string) => void;
}

const MemberManagementCard: React.FC<MemberManagementCardProps> = ({ member, group, currentUser, onAction, onSetTtsMessage }) => {
    const { language } = useSettings();
    
    const handlePromote = async (newRole: 'Admin' | 'Moderator') => {
        const success = await geminiService.promoteGroupMember(group.id, member, newRole);
        if (success) {
            onSetTtsMessage(getTtsPrompt('member_promoted', language, { name: member.name, role: newRole }));
            onAction();
        }
    };

    const handleDemote = async (oldRole: 'Admin' | 'Moderator') => {
        const success = await geminiService.demoteGroupMember(group.id, member, oldRole);
        if (success) {
            onSetTtsMessage(getTtsPrompt('member_demoted', language, { name: member.name }));
            onAction();
        }
    };

    const handleRemove = async () => {
        if (window.confirm(`Are you sure you want to remove ${member.name} from the group? This cannot be undone.`)) {
            const success = await geminiService.removeGroupMember(group.id, member);
            if (success) {
                onSetTtsMessage(getTtsPrompt('member_removed', language, { name: member.name }));
                onAction();
            }
        }
    };

    // Determine roles of the member being displayed
    const isCreator = group.creator.id === member.id;
    const isAdmin = group.admins.some(a => a.id === member.id);
    const isModerator = group.moderators.some(m => m.id === member.id);

    // Determine roles of the current user viewing the page
    const viewerIsCreator = group.creator.id === currentUser.id;
    const viewerIsAdmin = group.admins.some(a => a.id === currentUser.id);

    // Determine permissions
    const canBeManaged = currentUser.id !== member.id && !isCreator;

    const getRoleLabel = () => {
        if (isCreator) return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300">Creator</span>;
        if (isAdmin) return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-400">Admin</span>;
        if (isModerator) return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-lime-500/20 text-lime-400">Moderator</span>;
        return null;
    };
    
    return (
        <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full"/>
                <div>
                    <p className="font-semibold text-slate-200">{member.name}</p>
                    {getRoleLabel()}
                </div>
            </div>
            
            {canBeManaged && (
                <div className="flex gap-2">
                    {/* --- Admin promotion/demotion --- */}
                    {viewerIsCreator && ( // Only creator can manage admins
                        isAdmin 
                        ? <button onClick={() => handleDemote('Admin')} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white">Remove Admin</button>
                        : <button onClick={() => handlePromote('Admin')} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white">Make Admin</button>
                    )}
                    
                    {/* --- Moderator promotion/demotion --- */}
                    {(viewerIsCreator || viewerIsAdmin) && !isAdmin && ( // Admins can manage mods, but not other admins
                        isModerator
                        ? <button onClick={() => handleDemote('Moderator')} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white">Remove Mod</button>
                        : <button onClick={() => handlePromote('Moderator')} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-lime-600 hover:bg-lime-500 text-black">Make Mod</button>
                    )}

                    {/* --- Removal --- */}
                    {((viewerIsCreator) || (viewerIsAdmin && !isAdmin)) && ( // Admins can remove mods/members, creator can remove admins
                        <button onClick={handleRemove} className="text-xs font-semibold px-2 py-1.5 rounded-md bg-slate-600 hover:bg-red-600 text-white">Remove</button>
                    )}
                </div>
            )}
        </div>
    );
};

interface ManageGroupScreenProps {
  currentUser: User;
  groupId: string;
  onNavigate: (view: AppView, props?: any) => void;
  onSetTtsMessage: (message: string) => void;
  initialTab?: ActiveTab;
}


const ManageGroupScreen: React.FC<ManageGroupScreenProps> = ({ currentUser, groupId, onNavigate, onSetTtsMessage, initialTab }) => {
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'members');
    const { language } = useSettings();

    // Settings form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [joinQuestions, setJoinQuestions] = useState<string[]>(['', '', '']);
    const [newCoverPhoto, setNewCoverPhoto] = useState<string | null>(null);
    const coverPhotoInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        const groupDetails = await geminiService.getGroupById(groupId);
        if (groupDetails) {
            setGroup(groupDetails);
            // Initialize settings form
            setName(groupDetails.name);
            setDescription(groupDetails.description);
            setPrivacy(groupDetails.privacy);
            setRequiresApproval(groupDetails.requiresApproval);
            const existingQuestions = groupDetails.joinQuestions || [];
            setJoinQuestions([
                existingQuestions[0] || '',
                existingQuestions[1] || '',
                existingQuestions[2] || '',
            ]);
            setNewCoverPhoto(null); // Reset preview
        }
        setIsLoading(false);
    }, [groupId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSaveSettings = async () => {
        if (!group) return;
        const finalQuestions = joinQuestions.map(q => q.trim()).filter(q => q !== '');
        
        const settingsToUpdate: Parameters<typeof geminiService.updateGroupSettings>[1] = {
            name, 
            description, 
            privacy, 
            requiresApproval, 
            joinQuestions: finalQuestions 
        };
    
        if (newCoverPhoto) {
            settingsToUpdate.coverPhotoUrl = newCoverPhoto;
        }

        const success = await geminiService.updateGroupSettings(group.id, settingsToUpdate);

        if(success) {
            onSetTtsMessage(getTtsPrompt('group_settings_saved', language));
            fetchData(); // Refresh data
        }
    };

    const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewCoverPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleApproveRequest = async (user: User) => {
        await geminiService.approveJoinRequest(groupId, user.id);
        onSetTtsMessage(getTtsPrompt('request_approved', language, { name: user.name }));
        fetchData();
    }
    
    const handleRejectRequest = async (user: User) => {
        await geminiService.rejectJoinRequest(groupId, user.id);
        onSetTtsMessage(getTtsPrompt('request_rejected', language, { name: user.name }));
        fetchData();
    }

    const handleApprovePost = async (post: Post) => {
        await geminiService.approvePost(post.id);
        onSetTtsMessage(getTtsPrompt('post_approved', language));
        fetchData();
    }
    
    const handleRejectPost = async (post: Post) => {
        await geminiService.rejectPost(post.id);
        onSetTtsMessage(getTtsPrompt('post_rejected', language));
        fetchData();
    }

    if (isLoading || !group) {
        return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Loading group management...</p></div>;
    }
    
    const TabButton: React.FC<{tabId: ActiveTab; label: string; count?: number;}> = ({ tabId, label, count }) => (
        <button 
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors flex-shrink-0 whitespace-nowrap ${activeTab === tabId ? 'border-lime-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
            {label} {count !== undefined && count > 0 && <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-lime-500 text-black' : 'bg-slate-600 text-slate-200'}`}>{count}</span>}
        </button>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'requests':
                return (
                    <div className="space-y-4">
                        {(group.joinRequests || []).length > 0 ? group.joinRequests?.map(request => (
                             <div key={request.user.id} className="bg-slate-800 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={request.user.avatarUrl} alt={request.user.name} className="w-10 h-10 rounded-full"/>
                                        <span className="font-semibold text-slate-200">{request.user.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRejectRequest(request.user)} className="px-3 py-1.5 text-sm rounded-md bg-slate-600 hover:bg-slate-500 text-white font-semibold">Reject</button>
                                        <button onClick={() => handleApproveRequest(request.user)} className="px-3 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white font-bold">Approve</button>
                                    </div>
                                </div>
                                {request.answers && request.answers.length > 0 && group.joinQuestions && (
                                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                                        {request.answers.map((answer, i) => (
                                            <div key={i}>
                                                <p className="text-xs text-slate-400 font-semibold">{group.joinQuestions?.[i]}</p>
                                                <p className="text-sm text-slate-200 pl-2 border-l-2 border-slate-600">{answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>
                        )) : <p className="text-slate-400 text-center py-8">No pending join requests.</p>}
                    </div>
                )
            case 'posts':
                return (
                    <div className="space-y-3">
                        {(group.pendingPosts || []).length > 0 ? group.pendingPosts?.map(post => (
                             <div key={post.id} className="bg-slate-800 p-3 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <img src={post.author.avatarUrl} alt={post.author.name} className="w-10 h-10 rounded-full"/>
                                    <div>
                                        <p className="font-bold text-slate-200">{post.author.name}</p>
                                        <p className="text-slate-300 mt-1">{post.caption}</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => handleRejectPost(post)} className="px-3 py-1.5 text-sm rounded-md bg-slate-600 hover:bg-slate-500 text-white font-semibold">Reject</button>
                                    <button onClick={() => handleApprovePost(post)} className="px-3 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white font-bold">Approve</button>
                                </div>
                             </div>
                        )) : <p className="text-slate-400 text-center py-8">No pending posts.</p>}
                    </div>
                )
             case 'settings':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-300">Group Profile Picture</label>
                            <div className="relative group aspect-[16/9] bg-slate-700 rounded-lg overflow-hidden">
                                <img src={newCoverPhoto || group.coverPhotoUrl} alt="Group Cover" className="w-full h-full object-cover"/>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    ref={coverPhotoInputRef} 
                                    onChange={handleCoverPhotoChange}
                                    className="hidden"
                                />
                                <button 
                                    onClick={() => coverPhotoInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    <div className="text-center">
                                        <Icon name="edit" className="w-8 h-8 mx-auto"/>
                                        <p className="mt-1 text-sm font-semibold">Change Photo</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Group Name" className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 text-lg" />
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={4} className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3" />
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="privacy" value="public" checked={privacy === 'public'} onChange={() => setPrivacy('public')} className="w-4 h-4 text-lime-600" /> Public</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="privacy" value="private" checked={privacy === 'private'} onChange={() => setPrivacy('private')} className="w-4 h-4 text-lime-600" /> Private</label>
                        </div>
                        <div className="flex items-center gap-3"><input type="checkbox" id="reqApp" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="w-5 h-5 text-lime-600" /><label htmlFor="reqApp">Require admin approval for posts</label></div>
                        
                        {privacy === 'private' && (
                            <div className="border-t border-slate-700 pt-4 space-y-3">
                                <label className="font-semibold text-slate-200">Joining Questions (Optional)</label>
                                <p className="text-xs text-slate-400">Ask up to 3 questions for new members to answer.</p>
                                {joinQuestions.map((q, i) => (
                                     <input key={i} type="text" value={q} onChange={e => {
                                         const newQuestions = [...joinQuestions];
                                         newQuestions[i] = e.target.value;
                                         setJoinQuestions(newQuestions);
                                     }} placeholder={`Question ${i+1}`} className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2" />
                                ))}
                            </div>
                        )}

                        <button onClick={handleSaveSettings} className="bg-lime-600 hover:bg-lime-500 text-black font-bold py-2 px-5 rounded-lg">Save Settings</button>
                    </div>
                )
            case 'members':
            default:
                 return (
                    <div className="space-y-3">
                        {group.members.map(member => (
                            <MemberManagementCard
                                key={member.id}
                                member={member}
                                group={group}
                                currentUser={currentUser}
                                onAction={fetchData}
                                onSetTtsMessage={onSetTtsMessage}
                            />
                        ))}
                    </div>
                 );
        }
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-100">Manage Group</h1>
                <p className="text-slate-400 mb-6 text-lg">{group.name}</p>

                <div className="border-b border-slate-700 flex items-center mb-6 overflow-x-auto no-scrollbar">
                    <TabButton tabId="members" label="Members" count={group.memberCount} />
                    <TabButton tabId="requests" label="Join Requests" count={group.joinRequests?.length} />
                    <TabButton tabId="posts" label="Pending Posts" count={group.pendingPosts?.length} />
                    <TabButton tabId="settings" label="Settings" />
                </div>
                
                <div className="bg-slate-800/50 p-4 rounded-lg">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ManageGroupScreen;
