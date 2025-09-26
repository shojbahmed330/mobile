

import React, { useState, useEffect, useRef } from 'react';
import { Campaign } from '../types';
import Waveform from './Waveform';

interface AdModalProps {
  campaign: Campaign | null;
  onComplete: (campaignId: string) => void;
  onSkip: () => void;
}

const AdModal: React.FC<AdModalProps> = ({ campaign, onComplete, onSkip }) => {
  const adDuration = 15; // All ads last 15 seconds for this simulation
  const [timeLeft, setTimeLeft] = useState(adDuration);
  const [canSkip, setCanSkip] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!campaign) return;

    if (timeLeft <= 0) {
      onComplete(campaign.id);
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    if (adDuration - timeLeft >= 5 && !canSkip) {
        setCanSkip(true);
    }
    
    // Autoplay media
    if(timeLeft === adDuration) {
        if(campaign.videoUrl && videoRef.current) videoRef.current.play();
        if(campaign.audioUrl && audioRef.current) audioRef.current.play();
    }


    return () => clearTimeout(timerId);
  }, [timeLeft, onComplete, campaign, canSkip]);

  const progressPercentage = ((adDuration - timeLeft) / adDuration) * 100;

  if (!campaign) {
    return null; // Don't render anything if there's no campaign
  }

  const renderMedia = () => {
    if (campaign.videoUrl) {
        return <video ref={videoRef} src={campaign.videoUrl} autoPlay muted playsInline className="w-full h-full object-contain" />;
    }
    if (campaign.audioUrl) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                <audio ref={audioRef} src={campaign.audioUrl} className="hidden" />
                <h3 className="text-2xl font-bold text-center">{campaign.sponsorName}</h3>
                <p className="text-slate-300 text-center">{campaign.caption}</p>
                <div className="w-full h-24">
                   <Waveform isPlaying={timeLeft < adDuration && timeLeft > 0} />
                </div>
            </div>
        );
    }
    if (campaign.imageUrl) {
        return <img src={campaign.imageUrl} alt={campaign.caption} className="w-full h-full object-contain" />;
    }
    return <p className="text-slate-400">Sponsored content.</p>;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white p-4 animate-fade-in-fast">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-yellow-400">Sponsored Message from {campaign.sponsorName}</h2>
                    <div className="text-lg font-mono bg-black/30 px-3 py-1 rounded">
                        Reward in {timeLeft}s
                    </div>
                </div>
                 <p className="text-slate-300 mt-1">{campaign.caption}</p>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
                {renderMedia()}
            </div>

            <div className="p-4 bg-slate-800/50">
                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-4 overflow-hidden">
                    <div className="bg-yellow-400 h-2.5 rounded-full transition-all duration-1000 linear" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={onSkip}
                        disabled={!canSkip}
                        className="bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg transition-all"
                    >
                        {canSkip ? 'Skip Ad' : `Skip in ${5 - (adDuration - timeLeft)}s`}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdModal;
