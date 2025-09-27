
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Post, User, Comment } from '../types';
import Icon from './Icon';
import CommentCard from './CommentCard';
import TaggedContent from './TaggedContent';
import ReactionListModal from './ReactionListModal';

interface ImageModalProps {
  post: Post | null;
  currentUser: User;
  isLoading: boolean;
  onClose: () => void;
  onReactToPost: (postId: string, emoji: string) => void;
  onReactToComment: (postId: string, commentId: string, emoji: string) => void;
  onPostComment: (postId: string, text: string, parentId?: string | null) => Promise<void>;
  onEditComment: (postId: string, commentId: string, newText: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onOpenProfile: (userName: string) => void;
  onSharePost: (post: Post) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const ImageModal: React.FC<ImageModalProps> = ({ post, currentUser, isLoading, onClose, onReactToPost, onReactToComment, onPostComment, onEditComment, onDeleteComment, onOpenProfile, onSharePost }) => {
  if (!post || !post.author) {
    return null;
  }
  
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const pickerTimeout = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  useEffect(() => {
    if (replyingTo) {
        commentInputRef.current?.focus();
    }
  }, [replyingTo]);
  
  const commentThreads = useMemo(() => {
    if (!post.comments) return [];
    
    const comments = [...post.comments].filter(Boolean).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const commentsById = new Map<string, Comment & { replies: Comment[] }>();
    comments.forEach(c => commentsById.set(c.id, { ...c, replies: [] }));

    const topLevelComments: (Comment & { replies: Comment[] })[] = [];
    
    comments.forEach(c => {
        const commentWithReplies = commentsById.get(c.id);
        if (!commentWithReplies) return;

        if (c.parentId && commentsById.has(c.parentId)) {
            commentsById.get(c.parentId)?.replies.push(commentWithReplies);
        } else {
            topLevelComments.push(commentWithReplies);
        }
    });

    return topLevelComments;
  }, [post.comments]);

  const handlePlayComment = (comment: Comment) => {
    if (comment.type !== 'audio') return;
    setPlayingCommentId(prev => prev === comment.id ? null : comment.id);
  };
  
  const handlePostCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newCommentText.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
        await onPostComment(post.id, newCommentText, replyingTo?.id || null);
        setNewCommentText('');
        setReplyingTo(null);
    } catch (error) {
        console.error("Failed to post comment:", error);
    } finally {
        setIsPostingComment(false);
    }
  };
  
  const handleMouseEnterPicker = () => {
    if (pickerTimeout.current) clearTimeout(pickerTimeout.current);
    setPickerOpen(true);
  };

  const handleMouseLeavePicker = () => {
    pickerTimeout.current = window.setTimeout(() => {
        setPickerOpen(false);
    }, 300);
  };

  const handleReaction = (e: React.MouseEvent, emoji: string) => {
      e.stopPropagation();
      if (post) onReactToPost(post.id, emoji);
      setPickerOpen(false);
  };

  const myReaction = useMemo(() => {
    if (!currentUser || !post.reactions) return null;
    return post.reactions[currentUser.id] || null;
  }, [currentUser, post.reactions]);

  const reactionCount = useMemo(() => {
    if (!post.reactions) return 0;
    return Object.keys(post.reactions).length;
  }, [post.reactions]);

  const topReactions = useMemo(() => {
    if (!post.reactions) return [];
    const counts: { [key: string]: number } = {};
    Object.values(post.reactions).forEach(emoji => {
        counts[emoji as string] = (counts[emoji as string] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  }, [post.reactions]);

  const CommentWithReplies: React.FC<{
    comment: Comment & { replies: Comment[] };
    isReply?: boolean;
  }> = ({ comment, isReply = false }) => {
      return (
          <div className="flex flex-col gap-3">
              <div>
                  <CommentCard
                      comment={comment}
                      currentUser={currentUser}
                      isPlaying={playingCommentId === comment.id}
                      onPlayPause={() => handlePlayComment(comment)}
                      onAuthorClick={onOpenProfile}
                      onReply={setReplyingTo}
                      onReact={(commentId, emoji) => onReactToComment(post.id, commentId, emoji)}
                      onEdit={(commentId, newText) => onEditComment(post.id, commentId, newText)}
                      onDelete={(commentId) => onDeleteComment(post.id, commentId)}
                      isReply={isReply}
                  />
              </div>
              {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-6 pl-4 border-l-2 border-slate-700 space-y-3">
                      {comment.replies.map(reply => (
                          <CommentWithReplies
                              key={reply.id}
                              comment={reply as Comment & { replies: Comment[] }}
                              isReply={true}
                          />
                      ))}
                  </div>
              )}
          </div>
      );
  };

  if (isLoading) {
    return (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center">
            <Icon name="logo" className="w-16 h-16 text-lime-500 animate-spin" />
        </div>
    );
  }
  
  const imageUrl = post.imageUrl || post.newPhotoUrl;
  if (!imageUrl) {
    onClose();
    return null;
  }

  return (
    <>
    <div
      className="fixed inset-0 bg-black/85 z-50 flex flex-col md:flex-row items-stretch"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 p-2 rounded-full text-white bg-black/30 hover:bg-black/60 transition-colors z-[51]"
        aria-label="Close image viewer"
      >
        <Icon name="close" className="w-8 h-8" />
      </button>
      
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 relative" onClick={(e) => e.stopPropagation()}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <Icon name="logo" className="w-16 h-16 text-lime-500 animate-spin"/>
            </div>
          )}
          <img
            src={imageUrl}
            alt="Full screen view"
            className={`max-w-full max-h-full object-contain rounded-lg transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}
          />
      </main>

      <aside className={`w-full h-1/2 md:h-auto md:w-[380px] flex-shrink-0 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-700/50 flex flex-col transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`} onClick={(e) => e.stopPropagation()}>
          <header className="p-4 border-b border-slate-700">
              <button onClick={() => onOpenProfile(post.author.username)} className="flex items-center gap-3 group">
                <img src={post.author.avatarUrl} alt={post.author.name} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-bold text-lg text-lime-300 group-hover:underline">{post.author.name}</p>
                  <p className="text-sm text-slate-400">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
              </button>
              {post.caption && (
                <p className="text-slate-200 mt-3"><TaggedContent text={post.caption} onTagClick={onOpenProfile} /></p>
              )}
          </header>
          
          <div className="px-4 py-2 border-b border-slate-700">
             {(reactionCount > 0 || post.commentCount > 0) && (
                <div className="flex items-center justify-between py-2">
                    <button onClick={() => setIsReactionModalOpen(true)} className="flex items-center">
                        {topReactions.map(emoji => 
                            <span key={emoji} className="text-lg -ml-1 border-2 border-slate-900 rounded-full">{emoji}</span>
                        )}
                        <span className="text-sm text-lime-500 ml-2 hover:underline">{reactionCount}</span>
                    </button>
                    <span className="text-sm text-lime-500">{post.commentCount || 0} comments</span>
                </div>
              )}
          </div>
          
           <div className="flex items-center text-lime-400 gap-1 p-2 border-b border-slate-700">
                <div onMouseEnter={handleMouseEnterPicker} onMouseLeave={handleMouseLeavePicker} className="relative flex-1">
                    {isPickerOpen && (
                        <div onMouseEnter={handleMouseEnterPicker} onMouseLeave={handleMouseLeavePicker} className="absolute bottom-full mb-2 bg-slate-900/90 backdrop-blur-sm border border-lime-500/20 rounded-full p-1.5 flex items-center gap-1 shadow-lg animate-fade-in-fast">
                            {REACTIONS.map(emoji => (
                                <button key={emoji} onClick={(e) => handleReaction(e, emoji)} className="text-3xl p-1 rounded-full hover:bg-slate-700/50 transition-transform hover:scale-125">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={(e) => handleReaction(e, myReaction || '👍')} className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 ${myReaction ? 'text-lime-400 font-bold' : 'text-lime-400/80'}`}>
                        {myReaction ? <span className="text-xl">{myReaction}</span> : <Icon name="like" className="w-6 h-6" />}
                        <span className="font-semibold text-base">React</span>
                    </button>
                </div>
               <button onClick={() => commentInputRef.current?.focus()} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 text-lime-400/80">
                <Icon name="comment" className="w-6 h-6" />
                <span className="font-semibold text-base">Comment</span>
              </button>
              <button onClick={() => onSharePost(post)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200 text-lime-400/80">
                <Icon name="share" className="w-6 h-6" />
                <span className="font-semibold text-base">Share</span>
              </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-3">
             {commentThreads.length > 0 ? commentThreads.map(comment => (
                <CommentWithReplies key={comment.id} comment={comment} />
            )) : (
                <p className="text-center text-slate-500 pt-8">No comments yet.</p>
            )}
          </div>

          <footer className="p-3 border-t border-slate-700">
                {replyingTo && (
                    <div className="text-xs text-slate-400 px-2 pb-2 flex justify-between items-center">
                        <span>Replying to {replyingTo.author.name}</span>
                        <button onClick={() => setReplyingTo(null)} className="font-bold">Cancel</button>
                    </div>
                )}
                <form onSubmit={handlePostCommentSubmit} className="flex items-center gap-2">
                    <img src={currentUser.avatarUrl} alt="Your avatar" className="w-9 h-9 rounded-full" />
                    <input
                        ref={commentInputRef}
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-grow bg-slate-800 border border-slate-700 text-slate-100 rounded-full py-2.5 px-4 focus:ring-lime-500 focus:border-lime-500"
                    />
                    <button
                        type="submit"
                        disabled={isPostingComment || !newCommentText.trim()}
                        className="p-2.5 rounded-full bg-lime-600 text-black hover:bg-lime-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
                        aria-label="Post comment"
                    >
                        <Icon name="paper-airplane" className="w-5 h-5" />
                    </button>
                </form>
          </footer>
      </aside>
    </div>
    {isReactionModalOpen && (
        <ReactionListModal
            isOpen={isReactionModalOpen}
            onClose={() => setIsReactionModalOpen(false)}
            reactions={post.reactions || {}}
        />
    )}
    </>
  );
};

export default ImageModal;
