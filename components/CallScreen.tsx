import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Call } from '../types';
import { firebaseService } from '../services/firebaseService';
import Icon from './Icon';
import { AGORA_APP_ID } from '../constants';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import { geminiService } from '../services/geminiService';

interface CallScreenProps {
  currentUser: User;
  peerUser: User;
  callId: string;
  isCaller: boolean;
  onGoBack: () => void;
  onSetTtsMessage: (message: string) => void;
}

function stringToIntegerHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // Ensure it's a positive integer, as required by Agora for UIDs.
  return Math.abs(hash);
}

const CallScreen: React.FC<CallScreenProps> = ({ currentUser, peerUser, callId, isCaller, onGoBack, onSetTtsMessage }) => {
    const [call, setCall] = useState<Call | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isMicAvailable, setIsMicAvailable] = useState(true);
    const [isCamAvailable, setIsCamAvailable] = useState(true);
    const [callDuration, setCallDuration] = useState(0);

    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
    const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
    const [localVideoTrackState, setLocalVideoTrackState] = useState<ICameraVideoTrack | null>(null);
    const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
    
    // Video UI State
    const [mainViewUser, setMainViewUser] = useState<'local' | 'remote'>('remote');
    const [previewPosition, setPreviewPosition] = useState({ x: 16, y: 16 });
    const dragInfo = useRef<{ startX: number, startY: number, hasDragged: boolean, isDragging: boolean }>({ startX: 0, startY: 0, hasDragged: false, isDragging: false });


    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const callStatusRef = useRef<Call['status'] | null>(null);

    // Call state listener
    useEffect(() => {
        let isMounted = true;
        const unsubscribe = firebaseService.listenToCall(callId, (liveCall) => {
            if (!isMounted) return;

            setCall(liveCall);
            const currentStatus = liveCall?.status || null;
            callStatusRef.current = currentStatus;

            if (!liveCall || ['ended', 'declined', 'missed'].includes(currentStatus)) {
                // If the call ends, wait a moment to show the status, then go back.
                setTimeout(() => {
                    if (isMounted) onGoBack();
                }, 1500); 
            }
        });
        
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [callId, onGoBack]);

    // Timer effect
    useEffect(() => {
        if (call?.status === 'active' && !timerIntervalRef.current) {
            timerIntervalRef.current = window.setInterval(() => {
                setCallDuration(d => d + 1);
            }, 1000);
        } else if (call?.status !== 'active' && timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [call?.status]);
    
    // Ringing timeout for caller
    useEffect(() => {
        if (isCaller && call?.status === 'ringing') {
            const timeout = setTimeout(() => {
                if (callStatusRef.current === 'ringing') {
                    firebaseService.updateCallStatus(callId, 'missed');
                }
            }, 30000); // 30 second timeout
            return () => clearTimeout(timeout);
        }
    }, [isCaller, call?.status, callId]);

    const handleHangUp = useCallback(() => {
        if (callStatusRef.current === 'ringing' && !isCaller) {
             firebaseService.updateCallStatus(callId, 'declined');
        } else {
             firebaseService.updateCallStatus(callId, 'ended');
        }
    }, [callId, isCaller]);

    // Agora Lifecycle
    useEffect(() => {
        const setupAgora = async (callType: 'audio' | 'video') => {
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            agoraClient.current = client;

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                setRemoteUser(user);
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }
            });

            client.on('user-left', () => {
                setRemoteUser(null);
                firebaseService.updateCallStatus(callId, 'ended');
            });
            
            const uid = stringToIntegerHash(currentUser.id);
            const token = await geminiService.getAgoraToken(callId, uid);
            if (!token) throw new Error("Failed to retrieve Agora token.");
            await client.join(AGORA_APP_ID, callId, token, uid);

            const tracksToPublish: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [];
            
            try {
                const audio = await AgoraRTC.createMicrophoneAudioTrack();
                localAudioTrack.current = audio;
                tracksToPublish.push(audio);
                setIsMicAvailable(true);
            } catch (e) {
                console.warn("Could not get mic", e);
                setIsMicAvailable(false);
                setIsMuted(true);
            }

            if (callType === 'video') {
                try {
                    const video = await AgoraRTC.createCameraVideoTrack();
                    localVideoTrack.current = video;
                    setLocalVideoTrackState(video);
                    tracksToPublish.push(video);
                    setIsCamAvailable(true);
                } catch (e) {
                    console.warn("Could not get cam", e);
                    setIsCamAvailable(false);
                    setIsCameraOff(true);
                }
            }
            if(tracksToPublish.length > 0) {
                await client.publish(tracksToPublish);
            }
        };

        if (call?.type) {
             setupAgora(call.type).catch(error => {
                console.error("Agora setup failed:", error);
                onSetTtsMessage(`Call failed: ${error.message}`);
                handleHangUp();
             });
        }

        return () => {
            localAudioTrack.current?.stop();
            localAudioTrack.current?.close();
            localVideoTrack.current?.stop();
            localVideoTrack.current?.close();
            agoraClient.current?.leave();
        };
    }, [call?.type, callId, currentUser.id, handleHangUp, onSetTtsMessage]);

     useEffect(() => {
        const playLocalVideo = () => {
            if (localVideoTrackState && localVideoRef.current && !isCameraOff) {
                localVideoTrackState.play(localVideoRef.current, { fit: 'cover' });
            }
        };
        const playRemoteVideo = () => {
            if (remoteUser?.videoTrack && remoteVideoRef.current) {
                remoteUser.videoTrack.play(remoteVideoRef.current, { fit: 'cover' });
            }
        };

        if (localVideoTrackState?.isPlaying) localVideoTrackState.stop();
        if (remoteUser?.videoTrack?.isPlaying) remoteUser.videoTrack.stop();

        if (mainViewUser === 'local') {
            playLocalVideo(); // local in main view
            playRemoteVideo(); // remote in preview
        } else {
            playRemoteVideo(); // remote in main view
            playLocalVideo(); // local in preview
        }
    }, [mainViewUser, localVideoTrackState, remoteUser, isCameraOff]);
    
    const toggleMute = () => {
        if (!isMicAvailable) return;
        const muted = !isMuted;
        localAudioTrack.current?.setMuted(muted);
        setIsMuted(muted);
    };

    const toggleCamera = () => {
        if (!isCamAvailable) return;
        const cameraOff = !isCameraOff;
        localVideoTrack.current?.setEnabled(!cameraOff);
        setIsCameraOff(cameraOff);
    };
    
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const getStatusText = () => {
        switch (call?.status) {
            case 'ringing': return 'Ringing...';
            case 'active': return formatDuration(callDuration);
            case 'ended': return 'Call Ended';
            case 'declined': return 'Call Declined';
            case 'missed': return 'Call Missed';
            default: return 'Connecting...';
        }
    };
    
    // Drag and Swap handlers
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        dragInfo.current = { ...dragInfo.current, isDragging: true, hasDragged: false };
        const point = 'touches' in e ? e.touches[0] : e;
        dragInfo.current.startX = point.clientX - previewPosition.x;
        dragInfo.current.startY = point.clientY - previewPosition.y;
    };
    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragInfo.current.isDragging) return;
        dragInfo.current.hasDragged = true;
        const point = 'touches' in e ? e.touches[0] : e;
        const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();
        if (!containerRect) return;
        let newX = point.clientX - dragInfo.current.startX;
        let newY = point.clientY - dragInfo.current.startY;
        const previewWidth = e.currentTarget.clientWidth;
        const previewHeight = e.currentTarget.clientHeight;
        newX = Math.max(0, Math.min(newX, containerRect.width - previewWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - previewHeight));
        setPreviewPosition({ x: newX, y: newY });
    };
    const handleDragEnd = () => {
        if (!dragInfo.current.hasDragged) {
            setMainViewUser(prev => prev === 'local' ? 'remote' : 'local');
        }
        dragInfo.current.isDragging = false;
    };


    if (!call) return <div className="fixed inset-0 bg-black z-[90] flex items-center justify-center text-white">Connecting...</div>

    const isVideoCall = call.type === 'video';

    return (
        <div className="fixed inset-0 bg-slate-900 z-[90] flex flex-col items-center justify-between text-white p-6" onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
            <div className="text-center">
                <h1 className="text-3xl font-bold">{peerUser.name}</h1>
                <p className="text-slate-400 mt-2 text-lg">{getStatusText()}</p>
            </div>
            
            <div className="relative w-full h-full max-w-lg max-h-lg my-6">
                {isVideoCall ? (
                    <>
                        {/* Main View */}
                        <div className="w-full h-full bg-black rounded-lg overflow-hidden flex items-center justify-center">
                             {mainViewUser === 'remote' ? (
                                <div ref={remoteVideoRef} className="w-full h-full">
                                    {(!remoteUser?.hasVideo) && <img src={peerUser.avatarUrl} className="w-48 h-48 object-cover rounded-full opacity-50"/>}
                                </div>
                            ) : (
                                <div ref={localVideoRef} className={`w-full h-full transform scale-x-[-1]`}>
                                    {(isCameraOff || !isCamAvailable) && <div className="w-full h-full bg-slate-800 flex items-center justify-center"><img src={currentUser.avatarUrl} className="w-48 h-48 object-cover rounded-full opacity-50"/></div>}
                                </div>
                            )}
                        </div>

                        {/* Preview View */}
                        <div 
                            className="absolute w-24 h-40 md:w-32 md:h-48 bg-slate-800 rounded-lg overflow-hidden border-2 border-slate-600 cursor-pointer touch-none"
                            style={{ top: `${previewPosition.y}px`, left: `${previewPosition.x}px` }}
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                        >
                            {mainViewUser === 'local' ? (
                                <div ref={remoteVideoRef} className="w-full h-full">
                                    {(!remoteUser?.hasVideo) && <img src={peerUser.avatarUrl} className="w-full h-full object-cover opacity-80"/>}
                                </div>
                            ) : (
                                <div ref={localVideoRef} className={`w-full h-full transform scale-x-[-1]`}>
                                    {(isCameraOff || !isCamAvailable) && <div className="w-full h-full bg-slate-800 flex items-center justify-center"><img src={currentUser.avatarUrl} className="w-full h-full object-cover opacity-80"/></div>}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                         <img src={peerUser.avatarUrl} alt={peerUser.name} className="w-48 h-48 rounded-full border-4 border-slate-700"/>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-6">
                <button 
                    onClick={toggleMute} 
                    disabled={!isMicAvailable}
                    className={`p-4 rounded-full transition-colors ${!isMicAvailable ? 'bg-red-600/50 cursor-not-allowed' : isMuted ? 'bg-rose-600' : 'bg-slate-700'}`}
                >
                    <Icon name={!isMicAvailable || isMuted ? 'microphone-slash' : 'mic'} className="w-6 h-6" />
                </button>
                {isVideoCall && (
                    <button 
                        onClick={toggleCamera} 
                        disabled={!isCamAvailable}
                        className={`p-4 rounded-full transition-colors ${!isCamAvailable ? 'bg-red-600/50 cursor-not-allowed' : isCameraOff ? 'bg-rose-600' : 'bg-slate-700'}`}
                    >
                        <Icon name={!isCamAvailable || isCameraOff ? 'video-camera-slash' : 'video-camera'} className="w-6 h-6" />
                    </button>
                )}
                <button onClick={handleHangUp} className="p-4 rounded-full bg-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" transform="rotate(-135 12 12)"/></svg>
                </button>
            </div>
        </div>
    );
};
export default CallScreen;