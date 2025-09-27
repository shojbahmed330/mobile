import React, { useState, useEffect } from 'react';
import { Post, User, CategorizedExploreFeed, Comment } from '../types';
import { geminiService } from '../services/geminiService';
import { PostCard } from './PostCard';
import Icon from './Icon';
import PostCarousel from './PostCarousel';

interface ExploreScreenProps {
  currentUser: User;
  onReactToPost: (postId: string, emoji: string) => void;
  onViewPost: (postId: string) => void;
  onOpenProfile: (userName: string) => void;
  onStartComment: (postId: string, commentToReplyTo?: Comment) => void;
  onSharePost: (post: Post) => void;
  onOpenPhotoViewer: (post: Post) => void;
}

const SkeletonCarousel: React.FC<{ title: string }> = ({ title }) => (
    <div>
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-80 flex-shrink-0">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full mx-auto overflow-hidden relative">
                        <div className="animate-pulse flex flex-col gap-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-700"></div>
                                <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                                <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                                </div>
                            </div>
                            <div className="h-24 bg-slate-700 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ExploreScreen: React.FC<ExploreScreenProps> = ({
  currentUser,
  onReactToPost,
  onViewPost,
  onOpenProfile,
  onStartComment,
  onSharePost,
  onOpenPhotoViewer,
}) => {
    const [categorizedFeed, setCategorizedFeed] = useState<CategorizedExploreFeed | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchExploreFeed = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const feed = await geminiService.getCategorizedExploreFeed(currentUser.id);
                setCategorizedFeed(feed);
            } catch (err) {
                console.error("Failed to fetch categorized explore feed:", err);
                setError("Could not load Explore feed. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchExploreFeed();
    }, [currentUser.id]);

    const commonPostCardProps = {
        currentUser,
        onReact: onReactToPost,
        onViewPost,
        onAuthorClick: onOpenProfile,
        onStartComment,
        onSharePost,
        onOpenPhotoViewer,
        isActive: false,
        isPlaying: false,
        onPlayPause: () => {},
    };

    if (isLoading) {
        return (
            <div className="h-full w-full overflow-y-auto p-4 md:p-8 space-y-12">
                <div className="max-w-7xl mx-auto">
                    <div className="h-10 bg-slate-700 rounded w-1/4 mb-2"></div>
                    <div className="h-5 bg-slate-700 rounded w-1/3 mb-12"></div>
                    <SkeletonCarousel title="Trending" />
                    <SkeletonCarousel title="For You" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center text-red-400">
                <Icon name="close" className="w-16 h-16" />
                <h2 className="text-2xl font-bold">An Error Occurred</h2>
                <p>{error}</p>
            </div>
        );
    }
    
    // FIX: Cast `arr` to `any[]` to access the `length` property, as Object.values infers the value as `unknown`.
    const isEmpty = !categorizedFeed || Object.values(categorizedFeed).every(arr => (arr as any[]).length === 0);

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-8 p-8 text-center">
                <Icon name="compass" className="w-24 h-24 text-slate-600" />
                <h2 className="text-slate-300 text-2xl font-bold">Nothing to explore yet</h2>
                <p className="text-slate-400 max-w-sm">
                It looks like there are no public posts available right now. Check back later!
                </p>
            </div>
        );
    }


  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-12">
            <header>
                 <h1 className="text-4xl font-bold text-slate-100">Explore</h1>
                <p className="text-slate-400 mt-1">Discover AI-curated content from across VoiceBook.</p>
                <div className="mt-6 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                        </svg>
                    </div>
                    <input 
                        type="search"
                        placeholder="Search for topics, people, or questions..."
                        className="bg-slate-800 border border-slate-700 text-slate-100 text-base rounded-full focus:ring-rose-500 focus:border-rose-500 block w-full pl-11 p-3.5 transition"
                    />
                </div>
            </header>

            {categorizedFeed?.forYou.length > 0 && (
                 <PostCarousel title="For You" posts={categorizedFeed.forYou} postCardProps={commonPostCardProps} />
            )}
            {categorizedFeed?.trending.length > 0 && (
                <PostCarousel title="Trending" posts={categorizedFeed.trending} postCardProps={commonPostCardProps} />
            )}
            {categorizedFeed?.questions.length > 0 && (
                <PostCarousel title="Popular Questions" posts={categorizedFeed.questions} postCardProps={commonPostCardProps} />
            )}
            {categorizedFeed?.funnyVoiceNotes.length > 0 && (
                <PostCarousel title="Funny Voice Notes" posts={categorizedFeed.funnyVoiceNotes} postCardProps={commonPostCardProps} />
            )}
             {categorizedFeed?.newTalent.length > 0 && (
                <PostCarousel title="New Talent" posts={categorizedFeed.newTalent} postCardProps={commonPostCardProps} />
            )}

        </div>
    </div>
  );
};

export default ExploreScreen;
