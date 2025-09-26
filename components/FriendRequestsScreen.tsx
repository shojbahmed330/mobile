


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, ScrollState } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface FriendRequestsScreenProps {
  currentUser: User;
  requests: User[];
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onRequestsUpdated: () => void;
  onOpenProfile: (username: string) => void;
  scrollState: ScrollState;
}

const FriendRequestsScreen: React.FC<FriendRequestsScreenProps> = ({ currentUser, requests, onSetTtsMessage, lastCommand, onRequestsUpdated, onOpenProfile, scrollState }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { language } = useSettings();

  useEffect(() => {
    if (requests.length > 0) {
      onSetTtsMessage(getTtsPrompt('friend_requests_loaded', language));
    } else {
      onSetTtsMessage(getTtsPrompt('no_friend_requests', language));
    }
  }, [requests.length, onSetTtsMessage, language]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollState === 'none') {
        return;
    }

    let animationFrameId: number;
    const animateScroll = () => {
        if (scrollState === 'down') {
            scrollContainer.scrollTop += 2;
        } else if (scrollState === 'up') {
            scrollContainer.scrollTop -= 2;
        }
        animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [scrollState]);

  const handleAccept = async (requestingUser: User) => {
    await geminiService.acceptFriendRequest(currentUser.id, requestingUser.id);
    onSetTtsMessage(getTtsPrompt('friend_request_accepted', language, { name: requestingUser.name }));
    onRequestsUpdated();
  };
  
  const handleDecline = async (requestingUser: User) => {
    await geminiService.declineFriendRequest(currentUser.id, requestingUser.id);
    onSetTtsMessage(getTtsPrompt('friend_request_declined', language, { name: requestingUser.name }));
    onRequestsUpdated();
  };

  const handleCommand = useCallback(async (command: string) => {
    const intentResponse = await geminiService.processIntent(command);
    if (intentResponse.slots && typeof intentResponse.slots.target_name === 'string') {
        const targetName = intentResponse.slots.target_name;
        const targetUser = requests.find(r => r.name.toLowerCase() === targetName.toLowerCase());

        if(targetUser) {
            if (intentResponse.intent === 'intent_accept_request') {
                handleAccept(targetUser);
            } else if (intentResponse.intent === 'intent_decline_request') {
                handleDecline(targetUser);
            }
        }
    }
  }, [requests]);

  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Icon name="bell" className="w-16 h-16 mb-4" />
        <p className="text-xl">No new friend requests</p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-slate-100">Friend Requests</h1>
        <div className="flex flex-col gap-4">
          {requests.map((user) => (
            <div key={user.id} className="bg-slate-800 rounded-lg p-4 flex items-center justify-between">
              <button onClick={() => onOpenProfile(user.username)} className="flex items-center gap-4 group">
                <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full group-hover:ring-2 group-hover:ring-rose-500 transition-all" />
                <div>
                  <p className="font-bold text-lg text-slate-100 group-hover:text-rose-400 transition-colors">{user.name}</p>
                  <p className="text-sm text-slate-400">{user.bio}</p>
                </div>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => handleDecline(user)} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Decline</button>
                <button onClick={() => handleAccept(user)} className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors">Accept</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsScreen;
