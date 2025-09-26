import React, { useMemo } from 'react';
import { User, AppView } from '../types';
import ChatWidget from './ChatWidget';
import { firebaseService } from '../services/firebaseService';

interface ChatManagerProps {
  currentUser: User;
  activeChats: User[];
  friends: User[];
  minimizedChats: Set<string>;
  chatUnreadCounts: Record<string, number>;
  onCloseChat: (peerId: string) => void;
  onMinimizeToggle: (peerId: string) => void;
  setIsChatRecording: (isRecording: boolean) => void;
  onNavigate: (view: AppView, props?: any) => void;
  onSetTtsMessage: (message: string) => void;
  onBlockUser: (user: User) => void;
}

const ChatManager: React.FC<ChatManagerProps> = ({
  currentUser,
  activeChats,
  friends,
  minimizedChats,
  chatUnreadCounts,
  onCloseChat,
  onMinimizeToggle,
  setIsChatRecording,
  onNavigate,
  onSetTtsMessage,
  onBlockUser,
}) => {
  const friendsMap = useMemo(() => {
    const map = new Map<string, User>();
    friends.forEach(friend => map.set(friend.id, friend));
    return map;
  }, [friends]);

  const upToDateActiveChats = useMemo(() => {
    return activeChats.map(peer => {
      const freshFriendData = friendsMap.get(peer.id);
      return freshFriendData ? { ...peer, ...freshFriendData } : peer;
    });
  }, [activeChats, friendsMap]);


  const openChats = upToDateActiveChats.filter(c => !minimizedChats.has(c.id));
  const minimizedChatUsers = upToDateActiveChats.filter(c => minimizedChats.has(c.id));

  return (
    <div className="fixed bottom-16 md:bottom-0 right-0 z-50 flex items-end gap-2 p-0 md:p-2 lg:p-4 lg:pr-[312px] pointer-events-none">
      {/* On mobile, widgets are full-screen and manage their own layout. On desktop, this div arranges them. */}
      <div className="hidden md:flex items-end gap-2 pointer-events-auto">
        {minimizedChatUsers.map(peer => (
          <ChatWidget
            key={peer.id}
            currentUser={currentUser}
            peerUser={peer}
            onClose={onCloseChat}
            onMinimize={onMinimizeToggle}
            onHeaderClick={onMinimizeToggle}
            isMinimized={true}
            unreadCount={chatUnreadCounts[firebaseService.getChatId(currentUser.id, peer.id)] || 0}
            setIsChatRecording={setIsChatRecording}
            onNavigate={onNavigate}
            onSetTtsMessage={onSetTtsMessage}
            onBlockUser={onBlockUser}
          />
        ))}
        {openChats.map(peer => (
          <ChatWidget
            key={peer.id}
            currentUser={currentUser}
            peerUser={peer}
            onClose={onCloseChat}
            onMinimize={onMinimizeToggle}
            onHeaderClick={onMinimizeToggle}
            isMinimized={false}
            unreadCount={0}
            setIsChatRecording={setIsChatRecording}
            onNavigate={onNavigate}
            onSetTtsMessage={onSetTtsMessage}
            onBlockUser={onBlockUser}
          />
        ))}
      </div>
       {/* Render widgets without a flex container on mobile */}
      <div className="contents md:hidden pointer-events-auto">
         {upToDateActiveChats.map(peer => (
             <ChatWidget
                key={peer.id}
                currentUser={currentUser}
                peerUser={peer}
                onClose={onCloseChat}
                onMinimize={onMinimizeToggle}
                onHeaderClick={onMinimizeToggle}
                isMinimized={minimizedChats.has(peer.id)}
                unreadCount={chatUnreadCounts[firebaseService.getChatId(currentUser.id, peer.id)] || 0}
                setIsChatRecording={setIsChatRecording}
                onNavigate={onNavigate}
                onSetTtsMessage={onSetTtsMessage}
                onBlockUser={onBlockUser}
            />
         ))}
      </div>
    </div>
  );
};

export default ChatManager;