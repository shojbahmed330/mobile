import React from 'react';
import { User } from '../types';

interface ContactsPanelProps {
  friends: User[];
  onOpenConversation: (peer: User) => void;
}

const formatTimeAgo = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `Just now`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};


const ContactsPanel: React.FC<ContactsPanelProps> = ({ friends, onOpenConversation }) => {
  const onlineFriends = friends.filter(f => f.onlineStatus === 'online');
  const offlineFriends = friends.filter(f => f.onlineStatus !== 'online');
  const sortedFriends = [...onlineFriends, ...offlineFriends];

  return (
    <aside className="w-72 flex-shrink-0 hidden lg:block py-6">
      <div className="bg-slate-900/70 backdrop-blur-sm border border-lime-500/20 p-4 rounded-lg h-full flex flex-col">
        <h3 className="font-bold text-lime-300 text-lg flex-shrink-0">Contacts</h3>
        {friends.length === 0 ? (
          <p className="text-lime-500 text-sm flex-grow flex items-center justify-center">No friends yet</p>
        ) : (
          <div className="flex-grow overflow-y-auto no-scrollbar mt-4 -mx-4">
            <ul className="px-4">
              {sortedFriends.map(friend => (
                <li key={friend.id}>
                  <button 
                    onClick={() => onOpenConversation(friend)}
                    className="w-full flex items-center gap-3 p-2 text-left rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <img src={friend.avatarUrl} alt={friend.name} className="w-9 h-9 rounded-full" />
                      <div 
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                          friend.onlineStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                    </div>
                    <span className="text-lime-300 truncate flex-grow">{friend.name}</span>
                    {friend.onlineStatus !== 'online' && friend.lastActiveTimestamp && (
                        <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatTimeAgo(friend.lastActiveTimestamp)}
                        </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ContactsPanel;
