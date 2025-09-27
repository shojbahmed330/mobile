import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Post, User, Comment, GroupRole } from '../types';
import Icon from './Icon';
import Waveform from './Waveform';
import TaggedContent from './TaggedContent';
import GroupRoleBadge from './GroupRoleBadge';
import { REEL_TEXT_FONTS } from '../constants';
import ReactionListModal from './ReactionListModal';

interface PostCardProps {
  post: Post;
  currentUser?: User;
  isActive: boolean;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReact: (postId: string, emoji: string) => void;
  onViewPost: (postId: string) => void;
  onAuthorClick: (username: string) => void;
  onStartComment: (postId: string, commentToReplyTo?: Comment) => void;
  onSharePost?: (post: Post) => void;
  onAdClick?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onOpenPhotoViewer?: (post: Post) => void;
  groupRole?: GroupRole;
  isGroupAdmin?: boolean;
  isPinned?: boolean;
  onPinPost?: (postId: string) => void;
  onUnpinPost?: (postId: string) => void;
  onVote?: (postId: string, optionIndex: number) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const REACTION_COLORS: { [key: string]: string } = {
    '👍': 'text-fuchsia-500',
    '❤️': 'text-red-500',
    '😂': 'text-yellow-500',
    '😮': 'text-yellow-500',
    '😢': 'text-yellow-500',
    '😡': 'text-orange-500',
};

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, isActive, isPlaying, onPlayPause, onReact, onViewPost, onAuthorClick, onStartComment, onSharePost, onAdClick, onDeletePost, onOpenPhotoViewer, groupRole, isGroupAdmin, isPinned, onPinPost, onUnpinPost, onVote }) => {
  if (!post || !post.author) {
    return null;
  }
    
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const pickerTimeout = useRef<number | null>(null);
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);


  const myReaction = React.useMemo(() => {
    if (!currentUser || !post.reactions) return null;
    return post.reactions[currentUser.id] || null;
  }, [currentUser, post.reactions]);

  const topReactions = React.useMemo(() => {
    if (!post.reactions) return [];
    const emojiCounts: { [emoji: string]: number } = {};
    for (const userId in post.reactions) {
        const emoji = post.reactions[userId];
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
    }
    return Object.entries(emojiCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
  }, [post.reactions]);

  const reactionCount = useMemo(() => {
    if (!post.reactions) return 0;
    return Object.keys(post.reactions).length;
  }, [post.reactions]);

  const userVotedOptionIndex = currentUser && post.poll ? post.poll.options.findIndex(opt => opt.votedBy.includes(currentUser.id)) : -1;
  const totalVotes = post.poll ? post.poll.options.reduce((sum, opt) => sum + opt.votes, 0) : 0;
  const isAuthor = currentUser?.id === post.author.id;
  const canShowMenu = isAuthor || isGroupAdmin;


  const timeAgo = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (isActive && post.isSponsored) { // Only autoplay sponsored content
        videoElement.play().catch(error => console.log("Autoplay prevented:", error));
      } else {
        videoElement.pause();
      }
    }
  }, [isActive, post.isSponsored]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
        if (isPlaying && isActive) {
            audioElement.play().catch(e => console.error("Audio playback error:", e));
        } else {
            audioElement.pause();
        }
    }
  }, [isPlaying, isActive, post.audioUrl]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleReaction = (e: React.MouseEvent, emoji: string) => {
      e.stopPropagation();
      onReact(post.id, emoji);
      setPickerOpen(false);
  }

  const handleDefaultReact = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReact(post.id, myReaction === '👍' ? '👍' : '👍');
  };
  
  const handleMouseEnter = () => {
    if (pickerTimeout.current) clearTimeout(pickerTimeout.current);
    setPickerOpen(true);
  };

  const handleMouseLeave = () => {
    pickerTimeout.current = window.setTimeout(() => {
        setPickerOpen(false);
    }, 300);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    longPressTimer.current = window.setTimeout(() => {
        setPickerOpen(true);
    }, 500);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleView = () => {
      if (post.audioUrl) {
        onPlayPause();
      } else {
        onViewPost(post.id);
      }
  }

  const handleAuthor = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!post.isSponsored) {
        onAuthorClick(post.author.username);
      }
  }

  const handleAdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.campaignId && onAdClick) {
        onAdClick(post);
    }
  };
  
  const getAdButtonText = () => {
    if (post.websiteUrl) return "Visit Site";
    if (post.allowDirectMessage) return "Send Message";
    return "Learn More";
  };

  const getPostTypeString = () => {
    if (post.isSponsored) return 'Sponsored';
    return timeAgo;
  }
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (window.confirm("Are you sure you want to permanently delete this post? This action cannot be undone.")) {
      onDeletePost?.(post.id);
    }
  }

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) {
      onUnpinPost?.(post.id);
    } else {
      onPinPost?.(post.id);
    }
    setMenuOpen(false);
  }

  const handleVote = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (userVotedOptionIndex === -1 && onVote) {
      onVote(post.id, index);
    }
  }
  
  const renderVisualMedia = () => {
    if (post.postType === 'profile_picture_change' && post.newPhotoUrl) {
        return (
             <div className="mb-4 flex justify-center">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPhotoViewer?.(post);
                    }}
                    className='w-48 h-48 rounded-full overflow-hidden bg-slate-800'
                    aria-label="View image full screen"
                >
                     <img src={post.newPhotoUrl} alt="Updated profile" className="w-full h-full object-cover" />
                </button>
            </div>
        );
    }

    if (post.postType === 'cover_photo_change' && post.newPhotoUrl) {
        return (
             <div className="rounded-lg overflow-hidden aspect-video bg-slate-800 mb-4">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPhotoViewer?.(post);
                    }}
                    className="w-full h-full block"
                    aria-label="View image full screen"
                >
                    <img src={post.newPhotoUrl} alt="Updated cover" className="w-full h-full object-cover" />
                </button>
            </div>
        );
    }

    if (post.videoUrl) {
      return (
        <div className="rounded-lg overflow-hidden aspect-video bg-black -mx-6 mb-4">
            <video
                ref={videoRef}
                src={post.videoUrl}
                muted={post.isSponsored}
                loop={post.isSponsored}
                playsInline
                controls={!post.isSponsored}
                className="w-full h-full object-contain"
            />
        </div>
      );
    }
    if (post.imageUrl) {
      return (
        <div className="rounded-lg overflow-hidden bg-black -mx-6 mb-4">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenPhotoViewer?.(post);
                }}
                className="w-full h-auto block"
                aria-label="View image full screen"
            >
                <img src={post.imageUrl} alt={post.imagePrompt || 'Post image'} className="w-full h-auto object-contain" />
            </button>
        </div>
      );
    }

    return null;
  }
  
  const renderAudioPlayer = () => {
    if (post.audioUrl && post.audioUrl !== '#') {
      return (
        <div className="relative h-24 bg-slate-800 rounded-xl overflow-hidden group/waveform mb-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); onPlayPause(); }}>
            <audio ref={audioRef} src={post.audioUrl} onEnded={onPlayPause} />
            <Waveform isPlaying={isPlaying && isActive} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover/waveform:opacity-100 transition-opacity duration-300">
            <button
                aria-label={isPlaying && isActive ? "Pause post" : "Play post"}
                className="w-16 h-16 rounded-full bg-fuchsia-600/70 text-white flex items-center justify-center transform scale-75 group-hover/waveform:scale-100 transition-transform duration-300 ease-in-out hover:bg-fuchsia-500"
            >
                <Icon name={isPlaying && isActive ? 'pause' : 'play'} className="w-8 h-8" />
            </button>
            </div>
        </div>
      );
    }
    return null;
  }

  const renderPoll = () => {
    if (!post.poll) return null;

    return (
      <div className="space-y-2 mb-4">
        <p className="font-semibold text-fuchsia-200 text-lg">{post.poll.question}</p>
        {post.poll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const hasVotedThis = userVotedOptionIndex === index;
          return (
            <button
              key={index}
              onClick={(e) => handleVote(e, index)}
              disabled={userVotedOptionIndex !== -1}
              className={`w-full text-left p-2.5 rounded-md border transition-colors relative overflow-hidden ${
                hasVotedThis
                  ? 'bg-fuchsia-900/50 border-fuchsia-400'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              } ${userVotedOptionIndex === -1 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className="absolute top-0 left-0 h-full bg-fuchsia-500/20"
                style={{ width: `${userVotedOptionIndex !== -1 ? percentage : 0}%`, transition: 'width 0.5s ease' }}
              ></div>
              <div className="relative flex justify-between items-center z-10">
                <span className={`font-medium ${hasVotedThis ? 'text-fuchsia-300' : 'text-fuchsia-200'}`}>{option.text}</span>
                {userVotedOptionIndex !== -1 && (
                  <span className="text-sm text-fuchsia-400 font-semibold">{Math.round(percentage)}% ({option.votes})</span>
                )}
              </div>
            </button>
          );
        })}
        <p className="text-xs text-fuchsia-500">{totalVotes} votes</p>
      </div>
    );
  };
  
  const renderBestAnswer = () => {
    if (!post.bestAnswerId || !post.comments) return null;
    const bestAnswer = post.comments.find(c => c.id === post.bestAnswerId);
    if (!bestAnswer) return null;

    return (
        <div className="mb-4 p-3 bg-green-900/50 border-l-4 border-green-500 rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <h4 className="font-bold text-green-400">Best Answer</h4>
            </div>
            <div className="flex items-start gap-2">
                <img src={bestAnswer.author.avatarUrl} alt={bestAnswer.author.name} className="w-8 h-8 rounded-full"/>
                <div>
                    <p className="font-semibold text-sm text-fuchsia-200">{bestAnswer.author.name}</p>
                    <p className="text-fuchsia-300 text-sm"><TaggedContent text={bestAnswer.text || ''} onTagClick={onAuthorClick} /></p>
                </div>
            </div>
        </div>
    );
}

  const font = REEL_TEXT_FONTS.find(f => f.name === post.captionStyle?.fontFamily);
  const fontClass = font ? font.class : 'font-sans';
  const fontWeightClass = post.captionStyle?.fontWeight === 'bold' ? 'font-bold' : '';
  const fontStyleClass = post.captionStyle?.fontStyle === 'italic' ? 'italic' : '';
  
  return (
    <>
      <div
        onClick={post.isSponsored ? handleAdClick : handleView}
        className={`
          bg-black/20 backdrop-blur-sm rounded-lg p-5 sm:p-6 w-full max-w-lg md:max-w-2xl mx-auto transition-all duration-300 ease-in-out border
          ${post.isSponsored ? 'cursor-pointer hover:bg-slate-800' : 'cursor-pointer hover:bg-slate-800'}
          ${isActive ? 'border-fuchsia-400/50 ring-2 ring-fuchsia-400/20' : 'border-fuchsia-500/20'}
        `}
      >
        <div className="flex items-start justify-between">
          <button onClick={handleAuthor} className="flex items-center text-left mb-4 group flex-grow">
            <img src={post.author.avatarUrl} alt={post.author.name} className="w-12 h-12 rounded-full mr-4 transition-all duration-300 group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-offset-black group-hover:ring-fuchsia-500" />
            <div>
              <div className="flex items-center flex-wrap">
                  <p className="font-bold text-fuchsia-200 text-lg transition-colors group-hover:text-fuchsia-400">
                    {post.isSponsored ? post.sponsorName : post.author.name}
                  </p>
                  {post.feeling && <p className="font-normal text-fuchsia-300/90 text-lg ml-1.5"> is feeling {post.feeling.emoji} {post.feeling.text}</p>}
                  {groupRole && <GroupRoleBadge role={groupRole} />}
              </div>
              <p className="text-fuchsia-500 text-sm">
                  {post.groupName ? (
                      <span className="hover:underline">{post.groupName}</span>
                  ) : (
                      getPostTypeString()
                  )}
              </p>
            </div>
          </button>
          {canShowMenu && (
            <div className="relative" ref={menuRef}>
              <button onClick={(e) => {e.stopPropagation(); setMenuOpen(p => !p)}} className="p-2 text-fuchsia-500 hover:bg-slate-800 rounded-full">
                <Icon name="ellipsis-vertical" className="w-5 h-5"/>
              </button>
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-black border border-fuchsia-500/20 rounded-lg shadow-xl z-10 text-sm font-semibold">
                   {isGroupAdmin && (
                      <button onClick={handlePin} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-fuchsia-300">{isPinned ? 'Unpin Post' : 'Pin Post'}</button>
                   )}
                   {isAuthor && (
                       <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-500/10">Delete Post</button>
                   )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          {post.postType === 'announcement' && <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300">Announcement</span>}
          {post.postType === 'question' && <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300">Question</span>}
        </div>

        <div className="space-y-4">
          {post.caption && <p className={`text-fuchsia-300 text-base leading-relaxed ${fontClass} ${fontWeightClass} ${fontStyleClass}`}><TaggedContent text={post.caption} onTagClick={onAuthorClick} /></p>}
          
          {renderBestAnswer()}
          {renderPoll()}
          {renderVisualMedia()}
          {renderAudioPlayer()}
        </div>

        {reactionCount > 0 && (
           <div className="flex items-center justify-between pt-3">
              <button onClick={(e) => { e.stopPropagation(); setIsReactionModalOpen(true); }} className="flex items-center">
                  {topReactions.map(emoji => 
                      <span key={emoji} className="text-lg -ml-1 border-2 border-slate-900 rounded-full">{emoji}</span>
                  )}
                  <span className="text-sm text-fuchsia-500 ml-2 hover:underline">{reactionCount}</span>
              </button>
              <button onClick={() => onViewPost(post.id)} className="text-sm text-fuchsia-500 hover:underline">{post.commentCount || 0} comments</button>
          </div>
        )}


        <div className="flex items-center text-fuchsia-400 gap-2 pt-2 mt-2 border-t border-fuchsia-500/20">
          {post.isSponsored ? (
              <button onClick={handleAdClick} className="flex-grow flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition-colors duration-200">
                <span className="font-semibold text-base">{getAdButtonText()}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </button>
          ) : (
              <>
                  <div 
                      onMouseEnter={handleMouseEnter} 
                      onMouseLeave={handleMouseLeave}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className="relative flex-1"
                  >
                      {isPickerOpen && (
                          <div 
                              onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                              className="absolute bottom-full mb-2 bg-slate-900/90 backdrop-blur-sm border border-fuchsia-500/20 rounded-full p-1.5 flex items-center gap-1 shadow-lg animate-fade-in-fast"
                          >
                              {REACTIONS.map(emoji => (
                                  <button key={emoji} onClick={(e) => handleReaction(e, emoji)} className="text-3xl p-1 rounded-full hover:bg-slate-700/50 transition-transform hover:scale-125">
                                      {emoji}
                                  </button>
                              ))}
                          </div>
                      )}
                      <button onClick={handleDefaultReact} className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 ${myReaction ? REACTION_COLORS[myReaction] : 'text-fuchsia-400'}`}>
                          <span className="text-xl transition-transform duration-200 ease-in-out" style={{transform: myReaction ? 'scale(1.1)' : 'scale(1)'}}>{myReaction || '👍'}</span>
                          <span className="font-semibold text-base">React</span>
                      </button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onStartComment(post.id); }} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                    <Icon name="comment" className="w-6 h-6" />
                    <span className="font-semibold text-base">Comment</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onSharePost?.(post); }} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                    <Icon name="share" className="w-6 h-6" />
                    <span className="font-semibold text-base">Share</span>
                  </button>
              </>
          )}
        </div>
      </div>
      {isReactionModalOpen && currentUser && (
          <ReactionListModal
              isOpen={isReactionModalOpen}
              onClose={() => setIsReactionModalOpen(false)}
              reactions={post.reactions || {}}
          />
      )}
    </>
  );
};