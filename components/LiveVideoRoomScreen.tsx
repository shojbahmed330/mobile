import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LiveVideoRoom, User, VideoParticipantState, LiveVideoRoomMessage } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { AGORA_APP_ID } from '../constants';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng';

// --- Helper Functions & Types ---

type CombinedParticipant = VideoParticipantState & {
    agoraUser?: IAgoraRTCRemoteUser;
    isSpeaking?: boolean;
};

function stringToIntegerHash(str: string): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

// --- Sub-components ---

const ParticipantVideo: React.FC<{
    participant: CombinedParticipant;
    isLocal: boolean;
    localVideoTrack: ICameraVideoTrack | null;
    isMainView?: boolean;
    isPiP?: boolean;
}> = React.memo(({ participant, isLocal, localVideoTrack, isMainView, isPiP }) => {
    const videoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const videoContainer = videoRef.current;
        if (!videoContainer) return;

        const trackToPlay = isLocal ? localVideoTrack : participant.agoraUser?.videoTrack;

        if (trackToPlay && !participant.isCameraOff) {
            trackToPlay.play(videoContainer, { fit: 'cover' });
        } else {
             if (trackToPlay?.isPlaying) trackToPlay.stop();
        }

        return () => {
             if (trackToPlay?.isPlaying) {
                try {
                    trackToPlay.stop();
                } catch (e) {
                    // This can happen on rapid unmounts, it's safe to ignore.
                }
            }
        };
    }, [participant.agoraUser?.videoTrack, localVideoTrack, participant.isCameraOff, isLocal]);
    
    const showVideo = !participant.isCameraOff && (isLocal ? localVideoTrack : participant.agoraUser?.hasVideo);

    return (
        <div className="w-full h-full bg-slate-900 relative group overflow-hidden rounded-lg transition-all duration-300">
            {showVideo ? (
                <div ref={videoRef} className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${isLocal ? 'transform scale-x-[-1]' : ''}`} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                    <img src={participant.avatarUrl} alt={participant.name} className={`${isPiP ? 'w-16 h-16' : 'w-24 h-24'} object-cover rounded-full opacity-50`} />
                </div>
            )}
            <div className={`absolute inset-0 border-4 pointer-events-none rounded-lg transition-all duration-300 ${participant.isSpeaking ? 'border-green-400 ring-4 ring-green-400/30' : 'border-transparent'}`} />
            <div className={`absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2 ${isPiP ? 'p-1' : 'p-2'}`}>
                {participant.isMuted && <Icon name="microphone-slash" className="w-4 h-4 text-white flex-shrink-0" />}
                <p className={`font-semibold text-white truncate text-shadow-lg ${isMainView ? 'text-lg' : 'text-sm'}`}>{participant.name}</p>
            </div>
        </div>
    );
});

const ChatMessage: React.FC<{ message: LiveVideoRoomMessage; isMe: boolean }> = ({ message, isMe }) => (
    <div className={`flex items-start gap-2 animate-slide-in-bottom ${isMe ? 'justify-end' : ''}`}>
        {!isMe && <img src={message.sender.avatarUrl} alt={message.sender.name} className="w-6 h-6 rounded-full mt-1" />}
        <div>
            {!isMe && <p className="text-xs text-slate-400 ml-2">{message.sender.name}</p>}
            <div className={`px-3 py-1.5 rounded-2xl text-sm max-w-xs break-words ${isMe ? 'bg-fuchsia-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                {message.text}
            </div>
        </div>
    </div>
);

// --- Main Component ---

interface LiveVideoRoomScreenProps {
    currentUser: User;
    roomId: string;
    onGoBack: () => void;
    onSetTtsMessage: (message: string) => void;
}

const LiveVideoRoomScreen: React.FC<LiveVideoRoomScreenProps> = ({ currentUser, roomId, onGoBack, onSetTtsMessage }) => {
    const [room, setRoom] = useState<LiveVideoRoom | null>(null);
    const [messages, setMessages] = useState<LiveVideoRoomMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isMicAvailable, setIsMicAvailable] = useState(true);
    const [isCamAvailable, setIsCamAvailable] = useState(true);

    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
    const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
    
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [speakingVolumes, setSpeakingVolumes] = useState<{ uid: number; level: number }[]>([]);
    
    const [mainViewParticipantId, setMainViewParticipantId] = useState<string | null>(null);
    const [controlsVisible, setControlsVisible] = useState(true);
    const controlsTimeoutRef = useRef<number | null>(null);
    const isMobile = useIsMobile();
    const [isChatOpen, setIsChatOpen] = useState(!isMobile);

    const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
    const pipRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef({ isDragging: false, startX: 0, startY: 0, hasDragged: false });


    // --- Core Logic & Lifecycle Effects ---

    useEffect(() => {
        let isMounted = true;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        const setupAgora = async () => {
            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                if (isMounted) setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
                if (mediaType === 'audio') user.audioTrack?.play();
            });
            client.on('user-left', user => { if (isMounted) setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid)); });
            client.on('volume-indicator', volumes => { if (isMounted) setSpeakingVolumes(volumes); });
            client.enableAudioVolumeIndicator();

            const uid = stringToIntegerHash(currentUser.id);
            const token = await geminiService.getAgoraToken(roomId, uid);
            if (!token) throw new Error("Failed to get Agora token.");
            
            await client.join(AGORA_APP_ID, roomId, token, uid);

            const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];
            let micMuted = false, camOff = false;

            try {
                localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
                tracksToPublish.push(localAudioTrack.current);
                setIsMicAvailable(true);
            } catch (e) { console.warn("Mic not available", e); setIsMicAvailable(false); micMuted = true; }
            
            try {
                localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
                tracksToPublish.push(localVideoTrack.current);
                setIsCamAvailable(true);
            } catch (e) { console.warn("Cam not available", e); setIsCamAvailable(false); camOff = true; }
            
            if (tracksToPublish.length > 0) await client.publish(tracksToPublish);
            
            if(isMounted) { setIsMuted(micMuted); setIsCameraOff(camOff); }
            await geminiService.updateParticipantStateInVideoRoom(roomId, currentUser.id, { isMuted: micMuted, isCameraOff: camOff });
        };

        geminiService.joinLiveVideoRoom(currentUser.id, roomId)
            .then(() => { if (isMounted) setupAgora(); })
            .catch(err => { console.error("Failed to join or setup Agora:", err); onGoBack(); });

        return () => {
            isMounted = false;
            localAudioTrack.current?.close();
            localVideoTrack.current?.close();
            agoraClient.current?.leave();
            geminiService.leaveLiveVideoRoom(currentUser.id, roomId);
        };
    }, [roomId, currentUser.id, onGoBack]);

    useEffect(() => {
        const unsubRoom = geminiService.listenToVideoRoom(roomId, liveRoom => liveRoom ? setRoom(liveRoom) : onGoBack());
        const unsubMessages = geminiService.listenToLiveVideoRoomMessages(roomId, setMessages);
        return () => { unsubRoom(); unsubMessages(); };
    }, [roomId, onGoBack]);

    // Controls visibility timeout
    useEffect(() => {
        if (controlsVisible) {
            controlsTimeoutRef.current = window.setTimeout(() => setControlsVisible(false), 5000);
        }
        return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
    }, [controlsVisible]);

    // --- Derived State (Participants, Layout) ---

    const participants = useMemo<CombinedParticipant[]>(() => {
        if (!room) return [];
        const speakingUids = new Set(speakingVolumes.filter(v => v.level > 10).map(v => v.uid));
        const combined = (room.participants || []).map(p => {
            const agoraUser = p.id === currentUser.id ? undefined : remoteUsers.find(u => u.uid === stringToIntegerHash(p.id));
            return { ...p, agoraUser, isSpeaking: speakingUids.has(stringToIntegerHash(p.id)) };
        });
        if (!combined.some(p => p.id === currentUser.id)) {
            combined.unshift({
                id: currentUser.id, name: currentUser.name, username: currentUser.username,
                avatarUrl: currentUser.avatarUrl, isMuted, isCameraOff,
                isSpeaking: speakingUids.has(stringToIntegerHash(currentUser.id))
            });
        }
        return combined;
    }, [room, remoteUsers, speakingVolumes, currentUser, isMuted, isCameraOff]);

    const localParticipant = participants.find(p => p.id === currentUser.id);

    const activeSpeaker = useMemo(() => {
        if (speakingVolumes.length === 0) return null;
        const mainSpeaker = speakingVolumes.reduce((max, current) => (current.level > max.level ? current : max), speakingVolumes[0]);
        return mainSpeaker.level > 10 ? participants.find(p => stringToIntegerHash(p.id) === mainSpeaker.uid) : null;
    }, [speakingVolumes, participants]);

    const mainParticipant = useMemo(() => {
        return participants.find(p => p.id === mainViewParticipantId) || activeSpeaker || participants.find(p => p.id !== currentUser.id) || localParticipant;
    }, [participants, mainViewParticipantId, activeSpeaker, currentUser.id, localParticipant]);

    const pipParticipant = mainParticipant?.id === localParticipant?.id ? (activeSpeaker || participants.find(p => p.id !== currentUser.id)) : localParticipant;

    const gridParticipants = participants.filter(p => p.id !== mainParticipant?.id && p.id !== pipParticipant?.id);

    // --- User Actions ---

    const handleLeaveOrEnd = () => room?.host.id === currentUser.id ? (window.confirm("End this call for everyone?") && geminiService.endLiveVideoRoom(currentUser.id, roomId)) : onGoBack();
    const toggleMute = async () => { if (!isMicAvailable) return; const muted = !isMuted; await localAudioTrack.current?.setMuted(muted); setIsMuted(muted); await geminiService.updateParticipantStateInVideoRoom(roomId, currentUser.id, { isMuted: muted }); };
    const toggleCamera = async () => { if (!isCamAvailable) return; const camOff = !isCameraOff; await localVideoTrack.current?.setEnabled(!camOff); setIsCameraOff(camOff); await geminiService.updateParticipantStateInVideoRoom(roomId, currentUser.id, { isCameraOff: camOff }); };
    const handleSendMessage = async (e: React.FormEvent) => { e.preventDefault(); const trimmed = newMessage.trim(); if (trimmed) { await geminiService.sendLiveVideoRoomMessage(roomId, currentUser, trimmed); setNewMessage(''); } };
    const handlePipClick = (e: React.MouseEvent | React.TouchEvent) => { e.stopPropagation(); if (mainParticipant && pipParticipant) { setMainViewParticipantId(pipParticipant.id); } };
    const handleMainViewClick = () => { if(mainParticipant && mainParticipant.id !== activeSpeaker?.id) setMainViewParticipantId(null); };

    // Drag handlers for PiP
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { dragInfo.current = { ...dragInfo.current, isDragging: true, hasDragged: false }; const point = 'touches' in e ? e.touches[0] : e; dragInfo.current.startX = point.clientX - pipPosition.x; dragInfo.current.startY = point.clientY - pipPosition.y; };
    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => { if (!dragInfo.current.isDragging) return; dragInfo.current.hasDragged = true; const point = 'touches' in e ? e.touches[0] : e; const containerRect = e.currentTarget.parentElement?.getBoundingClientRect(); if (!containerRect) return; let newX = point.clientX - dragInfo.current.startX; let newY = point.clientY - dragInfo.current.startY; newX = Math.max(8, Math.min(newX, containerRect.width - (pipRef.current?.clientWidth || 128) - 8)); newY = Math.max(8, Math.min(newY, containerRect.height - (pipRef.current?.clientHeight || 0) - 8)); setPipPosition({ x: newX, y: newY }); };
    const handleDragEnd = () => { if (dragInfo.current.isDragging && !dragInfo.current.hasDragged) { handlePipClick({} as any); } dragInfo.current.isDragging = false; };
    
    if (!room || !localParticipant) return <div className="h-full w-full flex items-center justify-center bg-black text-white">Connecting...</div>;

    return (
        <div className="h-full w-full flex flex-col md:flex-row bg-black text-white overflow-hidden">
            <main className="flex-grow relative bg-black flex flex-col" onClick={() => setControlsVisible(v => !v)} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}>
                {mainParticipant && (
                    <div className="w-full h-full flex items-center justify-center cursor-pointer" onDoubleClick={handleMainViewClick}>
                        <ParticipantVideo participant={mainParticipant} isLocal={mainParticipant.id === currentUser.id} localVideoTrack={localVideoTrack.current} isMainView />
                    </div>
                )}
                
                {pipParticipant && (
                    <div
                        ref={pipRef}
                        className="absolute w-28 h-44 md:w-32 md:h-52 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600 cursor-pointer touch-none shadow-2xl z-20"
                        style={{ top: `${pipPosition.y}px`, left: `${pipPosition.x}px` }}
                        onMouseDown={handleDragStart} onTouchStart={handleDragStart}
                        onDoubleClick={(e) => { e.stopPropagation(); setMainViewParticipantId(pipParticipant.id); }}
                    >
                        <ParticipantVideo participant={pipParticipant} isLocal={pipParticipant.id === currentUser.id} localVideoTrack={localVideoTrack.current} isPiP />
                    </div>
                )}
                
                <div className={`absolute bottom-0 left-0 right-0 p-4 z-30 transition-all duration-300 ${controlsVisible ? 'animate-controls-fade-in' : 'animate-controls-fade-out pointer-events-none'}`}>
                    <div className="max-w-md mx-auto bg-black/50 backdrop-blur-md p-3 rounded-full flex items-center justify-center gap-4">
                        <button onClick={(e) => {e.stopPropagation(); toggleMute();}} disabled={!isMicAvailable} className={`p-4 rounded-full transition-colors ${!isMicAvailable ? 'bg-red-600/50' : isMuted ? 'bg-rose-600' : 'bg-slate-700'}`}><Icon name={!isMicAvailable || isMuted ? 'microphone-slash' : 'mic'} className="w-6 h-6" /></button>
                        <button onClick={(e) => {e.stopPropagation(); toggleCamera();}} disabled={!isCamAvailable} className={`p-4 rounded-full transition-colors ${!isCamAvailable ? 'bg-red-600/50' : isCameraOff ? 'bg-rose-600' : 'bg-slate-700'}`}><Icon name={!isCamAvailable || isCameraOff ? 'video-camera-slash' : 'video-camera'} className="w-6 h-6" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setIsChatOpen(p => !p); }} className="p-4 rounded-full bg-slate-700 md:hidden"><Icon name="message" className="w-6 h-6"/></button>
                        <button onClick={(e) => {e.stopPropagation(); handleLeaveOrEnd();}} className="p-4 rounded-full bg-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" transform="rotate(-135 12 12)"/></svg></button>
                    </div>
                </div>
            </main>
            
            <aside className={`w-full md:w-80 flex-shrink-0 bg-black/80 backdrop-blur-sm border-l border-white/10 flex flex-col z-40 transition-transform duration-300 ${isMobile ? `fixed inset-0 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}` : (isChatOpen ? 'translate-x-0' : 'translate-x-full md:relative md:translate-x-0')}`}>
                 <header className="p-3 flex-shrink-0 flex items-center justify-between border-b border-slate-700">
                    <h2 className="font-bold text-lg">Live Chat</h2>
                    <button onClick={() => setIsChatOpen(false)} className="p-2 rounded-full hover:bg-slate-700"><Icon name="close" className="w-5 h-5"/></button>
                 </header>
                 <div className="flex-grow overflow-y-auto space-y-3 no-scrollbar p-2">
                     {messages.map(msg => <ChatMessage key={msg.id} message={msg} isMe={msg.sender.id === currentUser.id} />)}
                 </div>
                 <footer className="p-2 flex-shrink-0 border-t border-slate-700 bg-black/30">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a message..." className="w-full bg-slate-700/80 border border-slate-600 rounded-full py-2 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"/>
                        <button type="submit" className="p-2.5 bg-rose-600 rounded-full text-white hover:bg-rose-500 disabled:bg-slate-500" disabled={!newMessage.trim()}><Icon name="paper-airplane" className="w-5 h-5" /></button>
                    </form>
                </footer>
            </aside>
        </div>
    );
};

export default LiveVideoRoomScreen;
