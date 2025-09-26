

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Post, User, AppView } from '../types';
import ReelCard from './ReelCard';
import Icon from './Icon';

interface ReelsScreenProps {
  isLoading: boolean;
  posts: Post[];
  currentUser: User;
  onReactToPost: (postId: string, emoji: string) => void;
  onViewPost: (postId: string) => void;
  onOpenProfile: (userName: string) => void;
  onStartComment: (postId: string) => void;
  onNavigate: (view: AppView, props?: any) => void;
}

const ReelsScreen: React.FC<ReelsScreenProps> = ({
  isLoading,
  posts,
  currentUser,
  onReactToPost,
  onViewPost,
  onOpenProfile,
  onStartComment,
  onNavigate,
}) => {
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const reelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setReelRef = useCallback((node: HTMLDivElement | null, reelId: string) => {
    if (node) {
      reelRefs.current.set(reelId, node);
    } else {
      reelRefs.current.delete(reelId);
    }
  }, []);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const reelId = (entry.target as HTMLElement).dataset.reelId;
            if (reelId) {
                setActiveReelId(reelId);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    const currentRefs = reelRefs.current;
    currentRefs.forEach((reel) => observer.current?.observe(reel));
    
    if (posts.length > 0 && !activeReelId) {
        setActiveReelId(posts[0].id);
    }

    return () => {
      currentRefs.forEach((reel) => observer.current?.unobserve(reel));
      observer.current?.disconnect();
    };
  }, [posts, activeReelId]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <Icon name="logo" className="w-16 h-16 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-8 text-center bg-black">
         <div className="absolute top-5 right-5 z-20">
            <button
              onClick={() => onNavigate(AppView.CREATE_REEL)}
              className="p-3 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30"
              aria-label="Create Reel"
            >
              <Icon name="video-camera" className="w-7 h-7" />
            </button>
        </div>
        <Icon name="film" className="w-24 h-24 text-slate-600" />
        <h2 className="text-slate-300 text-2xl font-bold">No Reels Yet</h2>
        <p className="text-slate-400 max-w-sm">
          Once users start posting videos, you'll see them here in a vertical feed.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full snap-y snap-mandatory overflow-y-auto no-scrollbar bg-black relative">
       <div className="absolute top-5 right-5 z-20">
            <button
              onClick={() => onNavigate(AppView.CREATE_REEL)}
              className="p-3 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30"
              aria-label="Create Reel"
            >
              <Icon name="video-camera" className="w-7 h-7" />
            </button>
        </div>
      {posts.filter(Boolean).map((post) => (
        <div
          key={post.id}
          className="h-full w-full snap-start flex items-center justify-center relative"
          ref={(node) => setReelRef(node, post.id)}
          data-reel-id={post.id}
        >
          <ReelCard
            post={post}
            currentUser={currentUser}
            isActive={activeReelId === post.id}
            onReact={onReactToPost}
            onComment={() => onStartComment(post.id)}
            onAuthorClick={onOpenProfile}
          />
        </div>
      ))}
    </div>
  );
};

export default ReelsScreen;
