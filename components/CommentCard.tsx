import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Comment, User } from '../types';
import Icon from './Icon';
import Waveform from './Waveform';
import TaggedContent from './TaggedContent';

interface CommentCardProps {
  comment: Comment;
  currentUser: User;
  isPlaying: boolean;
  onPlayPause: () => void;
  onAuthorClick: (username: string) => void;
  onReply: (comment: Comment) => void;
  onReact: (commentId: string, emoji: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onDelete?: (commentId: string) => void;
  isReply?: boolean;
}

const AVAILABLE_REACTIONS = ['❤️', '😂', '👍', '😢', '😡', '🔥', '😮'];

const CommentCard: React.FC<CommentCardProps> = ({ comment, currentUser, isPlaying, onPlayPause, onAuthorClick, onReply, onReact, onEdit, onDelete }) => {
  if (!comment || !comment.author) {
    return null;
  }
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (pickerContainerRef.current && !pickerContainerRef.current.contains(event.target as Node)) {
            setPickerOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const timeAgo = useMemo(() => {
      const date = new Date(comment.createdAt);
      if (isNaN(date.getTime())) {
          return 'Just now';
      }
      
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return `${Math.floor(interval)}y`;
      interval = seconds / 2592000;
      if (interval > 1) return `${Math.floor(interval)}mo`;
      interval = seconds / 86400;
      if (interval > 1) return `${Math.floor(interval)}d`;
      interval = seconds / 3600;
      if (interval > 1) return `${Math.floor(interval)}h`;
      interval = seconds / 60;
      if (interval > 1) return `${Math.floor(interval)}m`;
      return 'Just now';
  }, [comment.createdAt]);


  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
        if (isPlaying) {
            audioElement.play().catch(e => console.error("Comment audio playback error:", e));
        } else {
            audioElement.pause();
        }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
        const handleEnded = () => {
            if (!audioElement.paused) {
                onPlayPause();
            }
        };
        audioElement.addEventListener('ended', handleEnded);
        return () => {
            audioElement.removeEventListener('ended', handleEnded);
        }
    }
  }, [onPlayPause]);

  const handleReact = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    onReact(comment.id, emoji);
    setPickerOpen(false);
  };
  
  const myReaction = comment.reactions?.[currentUser.id];
  const reactionCount = Object.keys(comment.reactions || {}).length;
  const isAuthor = comment.author.id === currentUser.id;

  const handleEdit = () => {
      if (onEdit && comment.text) {
          const newText = prompt("Edit your comment:", comment.text);
          if (newText !== null && newText.trim() !== comment.text) {
              onEdit(comment.id, newText.trim());
          }
      }
  };

  const handleDelete = () => {
      if (onDelete && window.confirm("Are you sure you want to delete this comment?")) {
          onDelete(comment.id);
      }
  };

  const renderContent = () => {
    switch(comment.type) {
        case 'text':
            return <p className="text-slate-200 mt-1 whitespace-pre-wrap"><TaggedContent text={comment.text || ''} onTagClick={onAuthorClick} /></p>;
        case 'image':
            return <img src={comment.imageUrl} alt="Comment image" className="mt-2 rounded-lg max-w-full h-auto max-h-60" />;
        case 'audio':
        default:
            return (
                <>
                    {comment.audioUrl && <audio ref={audioRef} src={comment.audioUrl} className="hidden" />}
                    <button 
                        onClick={onPlayPause}
                        aria-label={isPlaying ? 'Pause comment' : 'Play comment'}
                        className={`w-full h-12 mt-1 p-2 rounded-md flex items-center gap-3 text-white transition-colors ${isPlaying ? 'bg-sky-500/30' : 'bg-slate-600/50 hover:bg-slate-600'}`}
                    >
                        <Icon name={isPlaying ? 'pause' : 'play'} className="w-5 h-5 flex-shrink-0" />
                        <div className="h-full flex-grow">
                            <Waveform isPlaying={isPlaying} barCount={25} />
                        </div>
                        <span className="text-xs font-mono self-end pb-1">{comment.duration}s</span>
                    </button>
                </>
            );
    }
  };
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 flex gap-3 items-start relative">
        <button onClick={() => onAuthorClick(comment.author.username)} className="flex-shrink-0 group">
            <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-10 h-10 rounded-full transition-all group-hover:ring-2 group-hover:ring-sky-400" />
        </button>
        <div className="flex-grow">
            <div className="flex items-baseline gap-2">
                <button onClick={() => onAuthorClick(comment.author.username)} className="font-bold text-slate-200 hover:text-sky-300 transition-colors">{comment.author.name}</button>
            </div>
            {renderContent()}
            
            {reactionCount > 0 && (
                <div className="absolute -bottom-2 right-2 bg-slate-800 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 border border-slate-600">
                    <span>{Object.values(comment.reactions || {})[0]}</span>
                    <span>{reactionCount}</span>
                </div>
            )}
            
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <div 
                    ref={pickerContainerRef}
                    className="relative"
                >
                    {isPickerOpen && (
                        <div 
                            className="absolute bottom-full mb-2 bg-slate-900/90 backdrop-blur-sm border border-lime-500/20 rounded-full p-1.5 flex items-center gap-1 shadow-lg animate-fade-in-fast"
                        >
                            {AVAILABLE_REACTIONS.map(emoji => (
                                <button key={emoji} onClick={(e) => handleReact(e, emoji)} className="text-2xl p-1 rounded-full hover:bg-slate-700/50 transition-transform hover:scale-125">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setPickerOpen(p => !p)} className={`font-semibold hover:underline ${myReaction ? 'text-lime-400' : ''}`}>
                      {myReaction ? myReaction : 'React'}
                    </button>
                </div>
                <span className="text-slate-500">•</span>
                <button onClick={() => onReply(comment)} className="font-semibold hover:underline">Reply</button>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{timeAgo}</span>
                {isAuthor && onEdit && onDelete && (
                    <>
                        <span className="text-slate-500">•</span>
                        <button onClick={handleEdit} className="font-semibold hover:underline">Edit</button>
                        <span className="text-slate-500">•</span>
                        <button onClick={handleDelete} className="font-semibold hover:underline text-red-400">Delete</button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default CommentCard;
