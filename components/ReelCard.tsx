import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Post, User } from '../types';
import Icon from './Icon';
import TaggedContent from './TaggedContent';
import { REEL_TEXT_FONTS } from '../constants';


interface ReelCardProps {
  post: Post;
  currentUser: User;
  isActive: boolean;
  onReact: (postId: string, emoji: string) => void;
  onComment: (postId: string) => void;
  onAuthorClick: (username: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const ReelCard: React.FC<ReelCardProps> = ({ post, currentUser, isActive, onReact, onComment, onAuthorClick }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const pickerTimeout = useRef<number | null>(null);
  
  const myReaction = useMemo(() => {
    if (!currentUser || !post.reactions) return null;
    return post.reactions[currentUser.id] || null;
  }, [currentUser, post.reactions]);

  const reactionCount = useMemo(() => {
    if (!post.reactions) return 0;
    return Object.keys(post.reactions).length;
  }, [post.reactions]);


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  
  const handleDefaultReact = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      onReact(post.id, myReaction === '👍' ? '👍' : '👍');
      setPickerOpen(false);
  };
  
  const handleEmojiSelect = (e: React.MouseEvent | React.TouchEvent, emoji: string) => {
      e.stopPropagation();
      onReact(post.id, emoji);
      setPickerOpen(false);
  };

  const handleMouseEnter = () => {
      if (pickerTimeout.current) clearTimeout(pickerTimeout.current);
      setPickerOpen(true);
  };

  const handleMouseLeave = () => {
      pickerTimeout.current = window.setTimeout(() => {
          setPickerOpen(false);
      }, 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      longPressTimer.current = window.setTimeout(() => {
          setPickerOpen(true);
      }, 400);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      e.stopPropagation();
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
      }
  };

  const font = REEL_TEXT_FONTS.find(f => f.name === post.captionStyle?.fontFamily);
  const fontClass = font ? font.class : 'font-sans';
  const fontWeightClass = post.captionStyle?.fontWeight === 'bold' ? 'font-bold' : '';
  const fontStyleClass = post.captionStyle?.fontStyle === 'italic' ? 'italic' : '';

  return (
    <div className="w-full h-full relative" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={post.videoUrl}
        loop
        playsInline
        className="w-full h-full object-contain"
      />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <Icon name="play" className="w-20 h-20 text-white/70" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white z-20">
        <div className="flex items-end justify-between">
          <div className="flex-grow pr-16">
            <button onClick={(e) => { e.stopPropagation(); onAuthorClick(post.author.username); }} className="flex items-center gap-3 mb-2">
              <img src={post.author.avatarUrl} alt={post.author.name} className="w-12 h-12 rounded-full border-2 border-white" />
              <p className="font-bold text-lg">{post.author.name}</p>
            </button>
            <p className={`text-sm line-clamp-3 ${fontClass} ${fontWeightClass} ${fontStyleClass}`}>
              <TaggedContent text={post.caption} onTagClick={onAuthorClick} />
            </p>
          </div>
          <div className="flex flex-col items-center gap-5 flex-shrink-0">
            <div 
                className="flex flex-col items-center gap-1 relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {isPickerOpen && (
                    <div 
                        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                        className="absolute bottom-full mb-2 bg-black/80 backdrop-blur-sm border border-slate-700 rounded-full p-1.5 flex items-center gap-1 shadow-lg animate-fade-in-fast"
                    >
                        {REACTIONS.map(emoji => (
                            <button key={emoji} onClick={(e) => handleEmojiSelect(e, emoji)} className="text-3xl p-1 rounded-full hover:bg-slate-700/50 transition-transform hover:scale-125">
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
                <button 
                    onClick={(e) => handleDefaultReact(e)} 
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="flex flex-col items-center gap-1"
                >
                    {myReaction ? (
                        <span className="text-3xl transition-transform transform hover:scale-110">{myReaction}</span>
                    ) : (
                        <Icon name="like" className="w-8 h-8 transition-colors" />
                    )}
                    <span className="text-xs font-semibold">{reactionCount}</span>
                </button>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onComment(post.id); }} className="flex flex-col items-center gap-1">
              <Icon name="comment" className="w-8 h-8" />
              <span className="text-xs font-semibold">{post.commentCount || 0}</span>
            </button>
            <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
              <Icon name="share" className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;