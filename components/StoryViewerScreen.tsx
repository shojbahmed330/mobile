

import React, { useState, useEffect, useRef } from 'react';
import { User, Story } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import Waveform from './Waveform';

interface StoryViewerScreenProps {
  currentUser: User;
  storiesByAuthor: {
    author: User;
    stories: Story[];
  }[];
  initialUserIndex: number;
  onGoBack: () => void;
  onOpenProfile: (userName: string) => void;
}

const StoryViewerScreen: React.FC<StoryViewerScreenProps> = ({ currentUser, storiesByAuthor, initialUserIndex, onGoBack, onOpenProfile }) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); // For story audio
  const musicRef = useRef<HTMLAudioElement>(null); // For background music
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const currentUserStories = storiesByAuthor[userIndex];
  const currentStory = currentUserStories?.stories[storyIndex];

  const goToNextStory = () => {
    if (storyIndex < currentUserStories.stories.length - 1) {
      setStoryIndex(s => s + 1);
    } else {
      goToNextUser();
    }
  };

  const goToPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(s => s - 1);
    } else {
      goToPrevUser();
    }
  };

  const goToNextUser = () => {
    if (userIndex < storiesByAuthor.length - 1) {
      setUserIndex(u => u + 1);
      setStoryIndex(0);
    } else {
      onGoBack(); // Last user, close viewer
    }
  };

  const goToPrevUser = () => {
    if (userIndex > 0) {
      setUserIndex(u => u - 1);
      setStoryIndex(0);
    }
  };

  useEffect(() => {
    if (!currentStory || isPaused) {
      return;
    }
    
    // Don't mark sponsored stories as "viewed" by the user
    if (!currentStory.isSponsored) {
        geminiService.markStoryAsViewed(currentStory.id, currentUser.id);
    }


    const videoElement = videoRef.current;
    const audioElement = audioRef.current;
    const musicElement = musicRef.current;

    const handleMediaEnd = () => {
        goToNextStory();
    };

    if (videoElement) {
        videoElement.currentTime = 0;
        videoElement.play().catch(e => console.error("Video autoplay error:", e));
        videoElement.addEventListener('ended', handleMediaEnd);
    }
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.error("Audio autoplay error:", e));
        audioElement.addEventListener('ended', handleMediaEnd);
    }
    if (musicElement) {
        musicElement.currentTime = 0;
        musicElement.play().catch(e => console.error("Music autoplay error:", e));
    }
    
    // For images and text, use a timeout
    if (currentStory.type === 'image' || currentStory.type === 'text') {
       timeoutRef.current = setTimeout(goToNextStory, currentStory.duration * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (videoElement) videoElement.removeEventListener('ended', handleMediaEnd);
      if (audioElement) audioElement.removeEventListener('ended', handleMediaEnd);
    };
  }, [storyIndex, userIndex, isPaused, currentStory, currentUser.id]);

  useEffect(() => {
    // Pause/Play logic
    const video = videoRef.current;
    const audio = audioRef.current;
    const music = musicRef.current;
    if(isPaused) {
        if(timeoutRef.current) clearTimeout(timeoutRef.current);
        video?.pause();
        audio?.pause();
        music?.pause();
    } else {
       // The main effect will handle restarting the timeout/playback
    }
  }, [isPaused]);
  
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const isLeft = clientX - left < width / 3;
    const isRight = clientX - left > (width * 2) / 3;

    if (isLeft) goToPrevStory();
    else if (isRight) goToNextStory();
  };

  if (!currentStory) {
    return null;
  }

  const renderContent = () => {
    switch (currentStory.type) {
      case 'video':
        return <video ref={videoRef} src={currentStory.contentUrl} className="w-full h-full object-cover" />;
      case 'image':
        return <img src={currentStory.contentUrl} alt="Story" className="w-full h-full object-cover" />;
      case 'voice':
        return <div className="p-8 w-full h-full flex items-center justify-center"><Waveform isPlaying={!isPaused} /><audio ref={audioRef} src={currentStory.contentUrl || ''} /></div>;
      case 'text':
        const style = currentStory.textStyle;
        return <div className={`w-full h-full flex items-center justify-center p-8 ${style?.backgroundColor}`}><p className={`text-3xl font-bold ${style?.fontFamily} ${style?.color} ${'text-' + style?.textAlign}`}>{currentStory.text}</p></div>;
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black z-40 flex items-center justify-center">
      <div className="w-full h-full max-w-md max-h-screen aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden relative" onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)} onClick={handleTap}>
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {currentUserStories.stories.map((s, i) => (
            <div key={s.id} className="h-1 bg-white/30 flex-grow rounded-full overflow-hidden">
                {i < storyIndex && <div className="h-full w-full bg-white" />}
                {i === storyIndex && !isPaused && <div className="h-full bg-white" style={{ animation: `progress ${currentStory.duration}s linear forwards` }}/>}
                 {i === storyIndex && isPaused && <div className="h-full bg-white" />}
            </div>
          ))}
        </div>
        <style>{`@keyframes progress { from { width: 0%} to { width: 100%}}`}</style>
        
        {/* Header */}
        <div className="absolute top-5 left-4 right-4 flex justify-between items-center z-10">
            <button onClick={(e) => { e.stopPropagation(); onOpenProfile(currentStory.author.username)}} className="flex items-center gap-2">
                <img src={currentStory.isSponsored ? currentStory.sponsorAvatar : currentStory.author.avatarUrl} alt={currentStory.author.name} className="w-9 h-9 rounded-full"/>
                <div>
                    <span className="font-semibold text-white text-shadow">{currentStory.isSponsored ? currentStory.sponsorName : currentStory.author.name}</span>
                    {currentStory.isSponsored && <p className="text-xs text-slate-300 text-shadow">Sponsored</p>}
                </div>
                {!currentStory.isSponsored && <span className="text-sm text-slate-300 text-shadow">{timeAgo(currentStory.createdAt)}</span>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onGoBack();}} className="text-white"><Icon name="close" className="w-7 h-7" /></button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Music */}
        {currentStory.music && <audio ref={musicRef} src={currentStory.music.url} loop />}
        
        {/* Sponsored CTA */}
        {currentStory.isSponsored && currentStory.ctaLink && (
            <a 
                href={currentStory.ctaLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm text-black font-bold py-3 px-8 rounded-full animate-fade-in-fast hover:scale-105 transition-transform"
            >
                Learn More
            </a>
        )}
      </div>
    </div>
  );
};

export default StoryViewerScreen;