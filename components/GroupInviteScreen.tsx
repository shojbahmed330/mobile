
import React, { useState, useEffect, useCallback } from 'react';
import { User, Group, AppView } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface GroupInviteScreenProps {
  currentUser: User;
  groupId: string;
  onGoBack: () => void;
  onSetTtsMessage: (message: string) => void;
}

const GroupInviteScreen: React.FC<GroupInviteScreenProps> = ({ currentUser, groupId, onGoBack, onSetTtsMessage }) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    const [groupData, friendsData] = await Promise.all([
      geminiService.getGroupById(groupId),
      geminiService.getFriendsList(currentUser.id)
    ]);
    setGroup(groupData);
    setFriends(friendsData);
    if (groupData?.invitedUserIds) {
      setInvitedIds(new Set(groupData.invitedUserIds));
    }
    setIsLoading(false);
  }, [groupId, currentUser.id]);

  useEffect(() => {
    onSetTtsMessage("Select friends to invite.");
    fetchData();
  }, [fetchData, onSetTtsMessage]);

  const handleInvite = async (friend: User) => {
    if (!group) return;
    const success = await geminiService.inviteFriendToGroup(group.id, friend.id);
    if (success) {
      setInvitedIds(prev => new Set(prev).add(friend.id));
      onSetTtsMessage(`Invitation sent to ${friend.name}.`);
    } else {
      onSetTtsMessage(`Could not send invitation to ${friend.name}.`);
    }
  };

  if (isLoading || !group) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300">Loading...</p></div>;
  }
  
  const memberIds = new Set(group.members.map(m => m.id));
  const friendsToInvite = friends.filter(f => 
    !memberIds.has(f.id) &&
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <header className="flex-shrink-0 flex items-center p-3 border-b border-slate-700 bg-slate-800">
        <button onClick={onGoBack} className="p-2 rounded-full hover:bg-slate-700 transition-colors mr-2">
          <Icon name="back" className="w-6 h-6 text-slate-300"/>
        </button>
        <div>
          <h2 className="font-bold text-lg text-slate-100">Invite Friends to {group.name}</h2>
        </div>
      </header>

      <div className="p-4">
        <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search friends to invite..."
            className="bg-slate-800 border border-slate-700 text-slate-100 text-base rounded-full focus:ring-lime-500 focus:border-lime-500 block w-full p-3 transition"
        />
      </div>

      <main className="flex-grow overflow-y-auto px-4 pb-4">
        {friendsToInvite.length > 0 ? (
          <div className="space-y-2">
            {friendsToInvite.map(friend => {
              const isInvited = invitedIds.has(friend.id);
              return (
                <div key={friend.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={friend.avatarUrl} alt={friend.name} className="w-12 h-12 rounded-full" />
                    <p className="font-semibold text-slate-200">{friend.name}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(friend)}
                    disabled={isInvited}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                      isInvited 
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                        : 'bg-lime-600 hover:bg-lime-500 text-black'
                    }`}
                  >
                    {isInvited ? 'Invited' : 'Invite'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-slate-400 mt-8">
            {searchQuery ? 'No friends match your search.' : 'All of your friends are already in this group!'}
          </p>
        )}
      </main>
    </div>
  );
};

export default GroupInviteScreen;
