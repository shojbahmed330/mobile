

import React, { useRef, useEffect, useState } from 'react';
import { Post } from '../types';
import Icon from './Icon';
import Waveform from './Waveform';

interface CampaignViewerModalProps {
  post: Post;
  onClose: () => void;
}

const CampaignViewerModal: React.FC<CampaignViewerModalProps> = ({ post, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.play().catch(console.error);
    }
    const audioElement = audioRef.current;
    if(audioElement) {
      audioElement.play().catch(console.error);
      setIsPlaying(true);
      audioElement.onended = () => setIsPlaying(false);
    }

    // Handle escape key to close
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [onClose]);

  const handlePlayPauseAudio = () => {
      const audioElement = audioRef.current;
      if (!audioElement) return;
      if (isPlaying) {
          audioElement.pause();
      } else {
          audioElement.play();
      }
      setIsPlaying(!isPlaying);
  }

  const renderMedia = () => {
    if (post.videoUrl) {
      return (
        <video ref={videoRef} src={post.videoUrl} autoPlay muted loop playsInline className="w-full h-full object-contain" />
      );
    }
    if (post.audioUrl && post.audioUrl !== '#') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4 text-white">
            <audio ref={audioRef} src={post.audioUrl} className="hidden" />
            <div className="w-full h-24">
               <Waveform isPlaying={isPlaying} />
            </div>
            <button onClick={handlePlayPauseAudio} className="w-16 h-16 rounded-full bg-rose-600/70 text-white flex items-center justify-center hover:bg-rose-500">
                <Icon name={isPlaying ? 'pause' : 'play'} className="w-8 h-8" />
            </button>
        </div>
      );
    }
    if (post.imageUrl) {
      return <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-contain" />;
    }
    return <p className="text-slate-400">Sponsored content.</p>;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white p-4 animate-fade-in-fast" onClick={onClose}>
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
             <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors" aria-label="Close ad viewer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
            
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700 mb-4">
                <img src={post.author.avatarUrl} alt="Sponsor" className="w-10 h-10 rounded-full" />
                <div>
                    <h3 className="font-bold text-slate-100 text-lg">{post.sponsorName}</h3>
                    <p className="text-xs text-slate-400">Sponsored</p>
                </div>
            </div>

            <p className="text-slate-200 mb-4">{post.caption}</p>

            <div className="aspect-video bg-slate-800 rounded-md flex items-center justify-center overflow-hidden">
                {renderMedia()}
            </div>
        </div>
    </div>
  );
};

export default CampaignViewerModal;
