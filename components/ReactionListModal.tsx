import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { firebaseService } from '../services/firebaseService';
import Icon from './Icon';

interface ReactionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: { [userId: string]: string };
}

const ReactionListModal: React.FC<ReactionListModalProps> = ({ isOpen, onClose, reactions }) => {
  const reactionCounts = useMemo(() => {
    const counts: { [emoji: string]: string[] } = {};
    for (const userId in reactions) {
        const emoji = reactions[userId];
        if (!counts[emoji]) {
            counts[emoji] = [];
        }
        counts[emoji].push(userId);
    }
    return counts;
  }, [reactions]);

  // FIX: Cast `userIds` to `string[]` to access the `length` property, as Object.entries infers the value as `unknown`.
  const reactionEntries = Object.entries(reactionCounts).filter(([, userIds]) => userIds && (userIds as string[]).length > 0);
  
  const [activeTab, setActiveTab] = useState(reactionEntries[0]?.[0] || '');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !reactionCounts[activeTab]) {
        setActiveTab(reactionEntries[0]?.[0] || '');
    }
  }, [isOpen, reactionCounts, activeTab, reactionEntries]);

  useEffect(() => {
    if (isOpen && activeTab) {
      const fetchUsers = async () => {
        setIsLoading(true);
        const userIds = reactionCounts[activeTab] || [];
        if (userIds.length > 0) {
          const fetchedUsers = await firebaseService.getUsersByIds(userIds);
          setUsers(fetchedUsers);
        } else {
          setUsers([]);
        }
        setIsLoading(false);
      };
      fetchUsers();
    }
  }, [isOpen, activeTab, reactionCounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
      <div className="w-full max-w-md h-[60vh] bg-slate-800 border border-lime-500/20 rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-4 border-b border-lime-500/20 flex items-center justify-center relative">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {reactionEntries.map(([emoji]) => (
              <button
                key={emoji}
                onClick={() => setActiveTab(emoji)}
                className={`text-2xl p-2 rounded-lg transition-colors flex-shrink-0 ${activeTab === emoji ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-full text-slate-400 hover:bg-slate-700">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-grow overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-center text-slate-400">Loading users...</p>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-700/50">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                  <p className="font-semibold text-slate-200">{user.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400">No one has reacted with this yet.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default ReactionListModal;
