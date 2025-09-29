import React, { useEffect, useRef } from 'react';
import { Call } from '../types';
import Icon from './Icon';

interface IncomingCallModalProps {
  call: Call;
  onAccept: (call: Call) => void;
  onReject: (call: Call) => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ call, onAccept, onReject }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // FIX: Replaced the Pixabay URL which was giving 403 Forbidden errors
        // with a stable, permissible audio file link.
        const ringtone = new Audio('https://github.com/user-attachments/assets/e5e3a356-628d-4a1e-8438-4e2e4b31124c');
        ringtone.loop = true;
        ringtone.play().catch(e => console.log("Ringtone autoplay prevented"));
        return () => {
            ringtone.pause();
        };
    }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in-fast">
        <div className="bg-slate-800 rounded-2xl p-8 text-center w-full max-w-sm flex flex-col items-center">
            <img src={call.caller.avatarUrl} alt={call.caller.name} className="w-24 h-24 rounded-full mb-4 border-4 border-slate-600"/>
            <h2 className="text-2xl font-bold text-white">{call.caller.name}</h2>
            <p className="text-slate-400 mt-1">VoiceBook {call.type} call...</p>
            <div className="flex justify-around w-full mt-8">
                <button onClick={() => onReject(call)} className="flex flex-col items-center gap-2 text-red-400">
                    <div className="w-16 h-16 bg-red-500/80 rounded-full flex items-center justify-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" transform="rotate(-135 12 12)"/></svg>
                    </div>
                    <span>Decline</span>
                </button>
                 <button onClick={() => onAccept(call)} className="flex flex-col items-center gap-2 text-green-400">
                    <div className="w-16 h-16 bg-green-500/80 rounded-full flex items-center justify-center animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    </div>
                    <span>Accept</span>
                </button>
            </div>
        </div>
    </div>
  );
};
export default IncomingCallModal;
