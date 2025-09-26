
import React, { useState, useEffect, useRef } from 'react';
import { GroupChat, Group, User } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface GroupChatScreenProps {
  currentUser: User;
  groupId: string;
  onGoBack: () => void;
  onOpenProfile: (userName: string) => void;
}

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ currentUser, groupId, onGoBack, onOpenProfile }) => {
  const [chat, setChat] = useState<GroupChat | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [chatData, groupData] = await Promise.all([
        geminiService.getGroupChat(groupId),
        geminiService.getGroupById(groupId)
      ]);
      setChat(chatData);
      setGroup(groupData);
      setIsLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll for new messages
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;
    
    const sentMessage = await geminiService.sendGroupChatMessage(groupId, currentUser, newMessage);
    setChat(prevChat => prevChat ? ({ ...prevChat, messages: [...prevChat.messages, sentMessage] }) : null);
    setNewMessage('');
  };

  if (isLoading || !group) {
    return <div className="flex items-center justify-center h-full bg-slate-900"><p className="text-slate-300">Loading chat...</p></div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <header className="flex-shrink-0 flex items-center p-3 border-b border-slate-700 bg-slate-800">
         <button onClick={onGoBack} className="p-2 rounded-full hover:bg-slate-700 transition-colors mr-2">
            <Icon name="back" className="w-6 h-6 text-slate-300"/>
         </button>
        <img src={group.coverPhotoUrl} alt={group.name} className="w-10 h-10 rounded-md object-cover" />
        <div className="ml-3">
          <h2 className="font-bold text-lg text-slate-100">{group.name} Chat</h2>
          <p className="text-sm text-slate-400">{group.memberCount} members</p>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        {chat?.messages.map((msg, index) => (
          <div key={msg.id} className="flex items-start gap-3">
            <button onClick={() => onOpenProfile(msg.sender.name)}>
              <img src={msg.sender.avatarUrl} alt={msg.sender.name} className="w-10 h-10 rounded-full" />
            </button>
            <div>
              <div className="flex items-baseline gap-2">
                <button onClick={() => onOpenProfile(msg.sender.name)} className="font-semibold text-lime-400 hover:underline">{msg.sender.name}</button>
                <span className="text-xs text-slate-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-200 bg-slate-700/50 px-3 py-2 rounded-lg inline-block">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="flex-shrink-0 p-3 border-t border-slate-700 bg-slate-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow bg-slate-700 border border-slate-600 text-slate-100 rounded-full py-2 px-4 focus:ring-lime-500 focus:border-lime-500"
          />
          <button type="submit" className="bg-lime-600 text-black p-2.5 rounded-full hover:bg-lime-500 disabled:bg-slate-500" disabled={!newMessage.trim()}>
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 8.25l-5.607 1.77a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826l3.296-1.048a.75.75 0 00.421-.23l7.48-7.48a.75.75 0 00-1.06-1.06l-7.48 7.48a.75.75 0 00-.23.421l-1.048 3.296z" /></svg>
          </button>
        </form>
      </footer>
    </div>
  );
};

export default GroupChatScreen;
