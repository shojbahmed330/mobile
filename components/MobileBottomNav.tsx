import React, { useState, useRef, useEffect } from 'react';
import { AppView, VoiceState } from '../types';
import Icon from './Icon';
import VoiceCommandInput from './VoiceCommandInput';

interface MobileBottomNavProps {
    onNavigate: (viewName: 'feed' | 'explore' | 'reels' | 'friends' | 'profile' | 'messages' | 'rooms' | 'groups' | 'menu') => void;
    friendRequestCount: number;
    activeView: AppView;
    voiceState: VoiceState;
    onMicClick: () => void;
    onSendCommand: (command: string) => void;
    commandInputValue: string;
    setCommandInputValue: (value: string) => void;
    ttsMessage: string;
    isChatRecording: boolean;
}

const NavItem: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    isActive: boolean;
    badgeCount?: number;
    onClick: () => void;
}> = ({ iconName, label, isActive, badgeCount = 0, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 relative ${
                isActive ? 'text-fuchsia-400' : 'text-slate-400 hover:text-fuchsia-300'
            }`}
        >
            <div className="relative">
                <Icon name={iconName} className="w-7 h-7" />
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white border border-slate-900">{badgeCount}</span>
                )}
            </div>
            <span className={`text-xs transition-all duration-300 ${isActive ? 'opacity-100 font-semibold' : 'opacity-0'}`}>{label}</span>
             <div className={`absolute top-0 w-8 h-1 bg-fuchsia-400 rounded-full transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 -translate-y-2'}`}></div>
        </button>
    );
};


const MobileBottomNav: React.FC<MobileBottomNavProps> = (props) => {
    const { onNavigate, friendRequestCount, activeView, voiceState, onMicClick, isChatRecording } = props;
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    
    // State for Draggable FAB
    const fabRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 160 });
    const dragStartRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);


    const handleTouchStart = (e: React.TouchEvent) => {
        hasMovedRef.current = false;
        const touch = e.touches[0];
        dragStartRef.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        hasMovedRef.current = true;
        const touch = e.touches[0];
        const fabElement = fabRef.current;
        if (!fabElement) return;

        const rect = fabElement.getBoundingClientRect();
        let newX = touch.clientX - dragStartRef.current.x;
        let newY = touch.clientY - dragStartRef.current.y;

        // Clamp position to be within the viewport
        newX = Math.max(8, Math.min(newX, window.innerWidth - rect.width - 8));
        newY = Math.max(8, Math.min(newY, window.innerHeight - rect.height - 8));

        setPosition({ x: newX, y: newY });
    };

    const handleFabClick = () => {
        if (hasMovedRef.current) return;
        setIsCommandOpen(true);
    };

    const getFabClass = () => {
        let base = "w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105";
        if (isChatRecording) {
          return `${base} bg-slate-500 cursor-not-allowed`;
        }
        switch (voiceState) {
            case VoiceState.LISTENING:
                return `${base} bg-red-500 ring-4 ring-red-500/50 animate-pulse`;
            case VoiceState.PROCESSING:
                return `${base} bg-yellow-600 cursor-not-allowed`;
            default: // IDLE
                return `${base} bg-gradient-to-br from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500`;
        }
    };
    
    return (
        <>
            {/* Main Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-t border-white/10 z-40 md:hidden flex justify-around items-center">
                <NavItem
                    iconName="home-solid"
                    label="Home"
                    isActive={activeView === AppView.FEED}
                    onClick={() => onNavigate('feed')}
                />
                 <NavItem
                    iconName="compass"
                    label="Explore"
                    isActive={activeView === AppView.EXPLORE}
                    onClick={() => onNavigate('explore')}
                />
                <NavItem
                    iconName="film"
                    label="Reels"
                    isActive={activeView === AppView.REELS}
                    onClick={() => onNavigate('reels')}
                />
                 <NavItem
                    iconName="message"
                    label="Messages"
                    isActive={activeView === AppView.CONVERSATIONS}
                    onClick={() => onNavigate('messages')}
                />
                <NavItem
                    iconName="ellipsis-vertical"
                    label="Menu"
                    isActive={activeView === AppView.MOBILE_MENU}
                    onClick={() => onNavigate('menu')}
                />
            </div>

            {/* Command FAB */}
            <div 
                ref={fabRef}
                className="fixed z-50 md:hidden touch-none"
                style={{ top: `${position.y}px`, left: `${position.x}px` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                <button
                  onClick={handleFabClick}
                  disabled={voiceState === VoiceState.PROCESSING || isChatRecording}
                  className={getFabClass()}
                  aria-label="Open Command Panel"
                >
                  <Icon name="mic" className="w-8 h-8"/>
                </button>
            </div>

            {/* Command Drawer */}
            <div 
                className={`fixed top-0 right-0 h-full w-4/5 max-w-sm bg-black/60 backdrop-blur-xl border-l border-white/10 z-[60] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col p-4 ${
                  isCommandOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-fuchsia-400">Voice Command</h2>
                    <button onClick={() => setIsCommandOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                      <Icon name="close" className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-grow flex flex-col justify-center">
                    {/* FIX: Explicitly map props to VoiceCommandInput to satisfy its interface. */}
                    <VoiceCommandInput
                        onSendCommand={(cmd) => { props.onSendCommand(cmd); setIsCommandOpen(false); }}
                        voiceState={props.voiceState}
                        onMicClick={props.onMicClick}
                        value={props.commandInputValue}
                        onValueChange={props.setCommandInputValue}
                        placeholder={props.ttsMessage}
                        isChatRecording={props.isChatRecording}
                    />
                </div>
                <p className="text-xs text-center text-slate-400 mt-4">Say "next post", "search for a user", "go back", or type a command.</p>
            </div>
      
            {/* Overlay when drawer is open */}
            {isCommandOpen && (
                <div 
                  onClick={() => setIsCommandOpen(false)}
                  className="fixed inset-0 bg-black/60 z-50 md:hidden animate-fade-in-fast"
                />
            )}
        </>
    );
};

export default MobileBottomNav;