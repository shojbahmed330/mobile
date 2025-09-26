
import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { FriendshipStatus } from '../types';
import Icon from './Icon';

interface UserCardProps {
    user: User;
    onProfileClick: (username: string) => void;
    children: React.ReactNode; // For action buttons
    onUnfriend?: (userToUnfriend: User) => void;
    onCancelRequest?: (userToCancel: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onProfileClick, children, onUnfriend, onCancelRequest }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const hasOptionsMenu = onUnfriend || onCancelRequest;

    return (
        <div className="bg-slate-800 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 w-full">
            <button onClick={() => onProfileClick(user.username)} className="flex-shrink-0 group">
                <div className="relative">
                    <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full transition-all group-hover:ring-4 group-hover:ring-lime-500/50" />
                    <div
                        className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-slate-800 ${
                            user.onlineStatus === 'online' ? 'bg-green-500' : 'bg-slate-500'
                        }`}
                        title={user.onlineStatus === 'online' ? 'Online' : 'Offline'}
                    />
                </div>
            </button>
            <div className="flex-grow text-center sm:text-left">
                <button onClick={() => onProfileClick(user.username)}>
                    <p className="font-bold text-xl text-slate-100 hover:text-lime-400 transition-colors">{user.name}</p>
                </button>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{user.bio}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 mt-3 sm:mt-0">
                {children}
                {hasOptionsMenu && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(prev => !prev)}
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors"
                        >
                            <Icon name="ellipsis-vertical" className="w-6 h-6" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-20 animate-fade-in-fast">
                                <ul>
                                    <li>
                                        <button
                                            onClick={() => { onProfileClick(user.username); setIsMenuOpen(false); }}
                                            className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700/50"
                                        >
                                            View Profile
                                        </button>
                                    </li>
                                    {onUnfriend && (
                                        <li>
                                            <button
                                                onClick={() => { onUnfriend(user); setIsMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10"
                                            >
                                                Unfriend
                                            </button>
                                        </li>
                                    )}
                                    {onCancelRequest && (
                                         <li>
                                            <button
                                                onClick={() => { onCancelRequest(user); setIsMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10"
                                            >
                                                Cancel Request
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserCard;
