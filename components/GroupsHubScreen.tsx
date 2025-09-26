
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppView, Group, User, GroupCategory } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { getTtsPrompt, DEFAULT_COVER_PHOTOS, GROUP_CATEGORIES } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface CreateGroupModalProps {
    onClose: () => void;
    onCreate: (name: string, description: string, coverUrl: string, privacy: 'public' | 'private', requiresApproval: boolean, category: GroupCategory) => Promise<void>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [requiresApproval, setRequiresApproval] = useState(false);
    const [category, setCategory] = useState<GroupCategory>(GROUP_CATEGORIES[0]);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim() || !description.trim()) return;
        setIsCreating(true);
        const coverUrl = DEFAULT_COVER_PHOTOS[Math.floor(Math.random() * DEFAULT_COVER_PHOTOS.length)];
        await onCreate(name, description, coverUrl, privacy, requiresApproval, category);
        // Parent will close modal and navigate
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Create a New Group</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Group Name"
                        className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500"
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What is this group about?"
                        rows={3}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500 resize-none"
                    />
                     <div>
                        <label htmlFor="category" className="block mb-2 text-sm font-medium text-slate-300">Category</label>
                        <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value as GroupCategory)}
                            className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500"
                        >
                            {GROUP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="border-t border-slate-700 pt-4 space-y-3">
                         <label className="font-semibold text-slate-200">Privacy</label>
                         <div className="flex gap-4">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="privacy" value="public" checked={privacy === 'public'} onChange={() => setPrivacy('public')} className="w-4 h-4 text-lime-600 bg-gray-700 border-gray-600 focus:ring-lime-500" />
                                 Public
                             </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="privacy" value="private" checked={privacy === 'private'} onChange={() => setPrivacy('private')} className="w-4 h-4 text-lime-600 bg-gray-700 border-gray-600 focus:ring-lime-500" />
                                 Private
                             </label>
                         </div>
                         <div className="flex items-center gap-3 pt-2">
                             <input type="checkbox" id="requiresApproval" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="w-5 h-5 text-lime-600 bg-gray-700 border-gray-600 rounded focus:ring-lime-500"/>
                             <label htmlFor="requiresApproval" className="text-sm font-medium text-slate-300">Require admin approval for new posts</label>
                         </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">Cancel</button>
                    <button onClick={handleCreate} disabled={!name.trim() || !description.trim() || isCreating} className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-black font-bold disabled:bg-slate-500">
                        {isCreating ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface GroupsHubScreenProps {
  currentUser: User;
  onNavigate: (view: AppView, props?: any) => void;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  groups: Group[];
  onGroupCreated: (newGroup: Group) => void;
}

const GroupsHubScreen: React.FC<GroupsHubScreenProps> = ({ currentUser, onNavigate, onSetTtsMessage, lastCommand, onCommandProcessed, groups, onGroupCreated }) => {
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory | 'All'>('All');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { language } = useSettings();

  const fetchSuggestedGroups = useCallback(async () => {
    setIsLoadingSuggestions(true);
    const suggestions = await geminiService.getSuggestedGroups(currentUser.id);
    setSuggestedGroups(suggestions);
    setIsLoadingSuggestions(false);
  }, [currentUser.id]);
  
  useEffect(() => {
    fetchSuggestedGroups();
    onSetTtsMessage(getTtsPrompt('groups_loaded', language));
  }, [fetchSuggestedGroups, onSetTtsMessage, language]);
  
  const handleViewGroup = (group: Group) => {
    onNavigate(AppView.GROUP_PAGE, { groupId: group.id });
  };

  const handleCommand = useCallback(async (command: string) => {
    try {
        const intentResponse = await geminiService.processIntent(command);
        const { intent, slots } = intentResponse;

        if (intent === 'intent_create_group') {
            setCreateModalOpen(true);
            onSetTtsMessage("Let's create a new group. Please provide the details.");
        } else if (intent === 'intent_view_group_by_name') {
            const groupName = slots?.group_name as string;
            if (groupName) {
                const targetGroup = groups.find(g => g.name.toLowerCase().trim() === groupName.toLowerCase().trim());
                if (targetGroup) {
                    handleViewGroup(targetGroup);
                    onSetTtsMessage(`Opening ${targetGroup.name}.`);
                } else {
                    onSetTtsMessage(`Sorry, I couldn't find a group named "${groupName}".`);
                }
            }
        } else if (intent === 'intent_filter_groups_by_category') {
            const category = slots?.category_name as string;
            if (category) {
                const foundCategory = GROUP_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
                if (foundCategory) {
                    setSelectedCategory(foundCategory);
                    onSetTtsMessage(`Showing ${foundCategory} groups.`);
                } else {
                    onSetTtsMessage(`Sorry, I couldn't find the category "${category}".`);
                }
            }
        } else if (intent === 'intent_search_group') {
            const query = slots?.search_query as string;
            if (query) {
                setSearchQuery(query);
                onSetTtsMessage(`Searching for groups matching "${query}".`);
            } else {
                onSetTtsMessage("You can search by typing, or say something like 'search for food groups'.");
                searchInputRef.current?.focus();
            }
        }
    } catch (e) { 
        console.error("Error processing command in GroupsHub:", e);
    } finally {
        onCommandProcessed();
    }
  }, [onCommandProcessed, onSetTtsMessage, groups]);
  
  useEffect(() => {
    if (lastCommand) {
        handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);


  const handleCreateGroup = async (name: string, description: string, coverPhotoUrl: string, privacy: 'public' | 'private', requiresApproval: boolean, category: GroupCategory) => {
    const newGroup = await geminiService.createGroup(currentUser, name, description, coverPhotoUrl, privacy, requiresApproval, category);
    if (newGroup) {
      onGroupCreated(newGroup); // This delegates navigation to the parent.
      setCreateModalOpen(false);
      onSetTtsMessage(getTtsPrompt('group_created', language));
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesCategory = selectedCategory === 'All' || group.category === selectedCategory;
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl font-bold text-slate-100">Groups</h1>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto bg-lime-600 hover:bg-lime-500 text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="add-friend" className="w-6 h-6"/>
            <span>Create Group</span>
          </button>
        </div>

        {!isLoadingSuggestions && suggestedGroups.length > 0 && (
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Groups You Might Like</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                    {suggestedGroups.map(group => (
                        <button key={group.id} onClick={() => handleViewGroup(group)} className="flex-shrink-0 w-48 bg-slate-800 rounded-lg text-left hover:bg-slate-700/50 transition-colors">
                           <img src={group.coverPhotoUrl} alt={group.name} className="w-full h-24 object-cover rounded-t-lg" />
                           <div className="p-3">
                                <h3 className="font-bold text-slate-100 truncate">{group.name}</h3>
                                <p className="text-xs text-slate-400">{group.memberCount} members</p>
                           </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="mb-6">
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                </div>
                <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search groups by name or description..."
                    className="bg-slate-800 border border-slate-700 text-slate-100 text-base rounded-full focus:ring-lime-500 focus:border-lime-500 block w-full pl-11 p-3 transition"
                />
            </div>
        </div>

        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {(['All', ...GROUP_CATEGORIES] as const).map(category => (
                <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex-shrink-0 ${
                        selectedCategory === category
                            ? 'bg-lime-600 text-black'
                            : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    {category}
                </button>
            ))}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-lg">
            <Icon name="users" className="w-20 h-20 mx-auto text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-300">No Groups Found</h2>
            <p className="text-slate-400 mt-2">{searchQuery || selectedCategory !== 'All' ? `No groups match your criteria.` : "Be the first to create a new community!"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => handleViewGroup(group)}
                className="w-full bg-slate-800/70 border border-slate-700 rounded-lg p-4 text-left flex flex-col sm:flex-row items-center gap-4 hover:border-lime-500/50 hover:bg-slate-800 transition-all duration-300"
              >
                <img src={group.coverPhotoUrl} alt={group.name} className="w-full sm:w-20 h-24 sm:h-20 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow w-full">
                    <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {group.privacy === 'private' && <Icon name="lock-closed" className="w-4 h-4 text-slate-400" />}
                        {group.name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{group.description}</p>
                </div>
                <div className="flex-shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-3 sm:mt-0">
                    <div className="text-center px-4">
                        <p className="text-2xl font-bold text-white">{group.memberCount}</p>
                        <p className="text-sm text-slate-400">Members</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-lime-500/20 text-lime-300">{group.category}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {isCreateModalOpen && <CreateGroupModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreateGroup} />}
    </div>
  );
};

export default GroupsHubScreen;
