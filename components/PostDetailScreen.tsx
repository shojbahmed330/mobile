import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Post, User, Comment, ScrollState } from '../types';
import { PostCard } from './PostCard';
import CommentCard from './CommentCard';
import { geminiService } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface PostDetailScreenProps {
  postId: string;
  newlyAddedCommentId?: string;
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onReactToPost: (postId: string, emoji: string) => void;
  onReactToComment: (postId: string, commentId: string, emoji: string) => void;
  onPostComment: (postId: string, text: string, parentId?: string | null) => Promise<void>;
  onEditComment: (postId: string, commentId: string, newText: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onOpenProfile: (userName: string) => void;
  onSharePost: (post: Post) => void;
  onOpenPhotoViewer: (post: Post) => void;
  scrollState: ScrollState;
  onCommandProcessed: () => void;
  onGoBack: () => void;
  onStartComment: (postId: string, commentToReplyTo?: Comment) => void;
}

const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ postId, newlyAddedCommentId, currentUser, onSetTtsMessage, lastCommand, onReactToPost, onReactToComment, onOpenProfile, onSharePost, onOpenPhotoViewer, scrollState, onCommandProcessed, onGoBack, onPostComment, onEditComment, onDeleteComment, onStartComment }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCommentId, setPlayingCommentId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const newCommentRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { language } = useSettings();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    isInitialLoad.current = true;
    setIsLoading(true);
    const unsubscribe = firebaseService.listenToPost(postId, (livePost) => {
        if (livePost) {
            setPost(livePost);
            if (isInitialLoad.current) { 
                onSetTtsMessage(getTtsPrompt('post_details_loaded', language));
                setIsLoading(false);
                isInitialLoad.current = false;
            }
        } else {
            onSetTtsMessage("This post could not be found.");
            setIsLoading(false);
        }

        if (newlyAddedCommentId) {
            setTimeout(() => {
                newCommentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    });

    return () => unsubscribe();
  }, [postId, onSetTtsMessage, language, newlyAddedCommentId]);


  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollState === 'none') return;

    let animationFrameId: number;
    const animateScroll = () => {
        if (scrollState === 'down') scrollContainer.scrollTop += 2;
        else if (scrollState === 'up') scrollContainer.scrollTop -= 2;
        animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [scrollState]);

  useEffect(() => {
    if (replyingTo) {
        commentInputRef.current?.focus();
    }
  }, [replyingTo]);
  
  const commentThreads = useMemo(() => {
    if (!post?.comments) return [];

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
  }, [post?.comments]);

  const handlePlayComment = useCallback((comment: Comment) => {
    if (comment.type !== 'audio') return;
    setPlayingCommentId(prev => prev === comment.id ? null : comment.id);
  }, []);
  
  const handleMarkBestAnswer = async (commentId: string) => {
    if (!post) return;
    const updatedPost = await geminiService.markBestAnswer(currentUser.id, post.id, commentId);
    if (updatedPost) {
        setPost(updatedPost);
        onSetTtsMessage("Best answer marked!");
    }
  };

  const handleCommand = useCallback(async (command: string) => {
    try {
        const intentResponse = await geminiService.processIntent(command);
        if (!post) return;

        switch (intentResponse.intent) {
            case 'intent_go_back': onGoBack(); break;
            case 'intent_like': onReactToPost(post.id, '👍'); break;
            case 'intent_share': if (post) onSharePost(post); break;
            case 'intent_comment': commentInputRef.current?.focus(); break;
            case 'intent_play_comment_by_author':
                if (intentResponse.slots?.target_name) {
                    const targetName = (intentResponse.slots.target_name as string).toLowerCase();
                    const commentToPlay = post.comments.find(c => c.author.name.toLowerCase().includes(targetName) && c.type === 'audio');
                    if (commentToPlay) {
                        handlePlayComment(commentToPlay);
                        onSetTtsMessage(`Playing comment from ${commentToPlay.author.name}.`);
                    } else {
                        onSetTtsMessage(`Sorry, I couldn't find an audio comment from ${targetName} on this post.`);
                    }
                }
                break;
        }
    } catch (error) {
        console.error("Error processing command:", error);
    } finally {
        onCommandProcessed();
    }
  }, [post, onReactToPost, handlePlayComment, onSetTtsMessage, onCommandProcessed, onGoBack, onSharePost]);

  useEffect(() => { if (lastCommand) handleCommand(lastCommand); }, [lastCommand, handleCommand]);
  
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


  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Loading post...</p></div>;
  }

  if (!post) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Post not found.</p></div>;
  }

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto">
      <div className="max-w-lg md:max-w-2xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
        <PostCard
          post={post}
          currentUser={currentUser}
          isActive={true}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(p => !p)}
          onReact={onReactToPost}
          onViewPost={() => {}}
          onAuthorClick={onOpenProfile}
          onSharePost={onSharePost}
          onOpenPhotoViewer={onOpenPhotoViewer}
          onStartComment={onStartComment}
        />

        <div className="bg-slate-800/50 rounded-xl p-4">
             <h3 className="text-lg font-bold text-slate-200 mb-4">Comments ({post.commentCount})</h3>
             <div className="flex flex-col gap-4">
                {commentThreads.length > 0 ? commentThreads.filter(Boolean).map(comment => (
                    <div key={comment.id} className="flex flex-col gap-3">
                        <div ref={comment.id === newlyAddedCommentId ? newCommentRef : null}>
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
                            />
                        </div>
                        {comment.replies.length > 0 && (
                            <div className="ml-6 pl-4 border-l-2 border-slate-700 space-y-3">
                                {comment.replies.filter(Boolean).map(reply => (
                                     <div key={reply.id} ref={reply.id === newlyAddedCommentId ? newCommentRef : null}>
                                        <CommentCard 
                                            comment={reply}
                                            currentUser={currentUser}
                                            isPlaying={playingCommentId === reply.id}
                                            isReply={true}
                                            onPlayPause={() => handlePlayComment(reply)}
                                            onAuthorClick={onOpenProfile}
                                            onReply={setReplyingTo}
                                            onReact={(commentId, emoji) => onReactToComment(post.id, commentId, emoji)}
                                            onEdit={(commentId, newText) => onEditComment(post.id, commentId, newText)}
                                            onDelete={(commentId) => onDeleteComment(post.id, commentId)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                         {replyingTo?.id === comment.id && (
                             <div className="ml-10">
                                <form onSubmit={handlePostCommentSubmit} className="flex items-center gap-2">
                                    <img src={currentUser.avatarUrl} alt="Your avatar" className="w-8 h-8 rounded-full" />
                                    <input
                                        ref={commentInputRef}
                                        type="text"
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        placeholder={`Replying to ${replyingTo.author.name}...`}
                                        className="flex-grow bg-slate-700 border-slate-600 text-slate-100 rounded-full py-2 px-4 text-sm"
                                    />
                                </form>
                            </div>
                         )}
                    </div>
                )) : (
                    <p className="text-slate-400 text-center py-4">Be the first to comment.</p>
                )}
             </div>
        </div>
        
        <div className="sticky bottom-0 bg-black/50 backdrop-blur-sm py-2">
            {replyingTo && (
                <div className="text-sm text-slate-400 px-2 pb-2 flex justify-between items-center">
                    <span>Replying to {replyingTo.author.name}</span>
                    <button onClick={() => setReplyingTo(null)} className="font-bold text-xs">Cancel</button>
                </div>
            )}
            <form onSubmit={handlePostCommentSubmit} className="flex items-center gap-2">
                <img src={currentUser.avatarUrl} alt="Your avatar" className="w-10 h-10 rounded-full" />
                <input
                    ref={!replyingTo ? commentInputRef : null}
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-grow bg-slate-800 border border-slate-700 text-slate-100 rounded-full py-2.5 px-4 focus:ring-lime-500 focus:border-lime-500"
                />
            </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetailScreen;
