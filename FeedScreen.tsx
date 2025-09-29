
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, User, ScrollState, Campaign, AppView, Story, Comment } from '../types';
import { PostCard } from './PostCard';
import CreatePostWidget from './CreatePostWidget';
import SkeletonPostCard from './SkeletonPostCard';
import { geminiService } from '../services/geminiService';
import RewardedAdWidget from './RewardedAdWidget';
import { getTtsPrompt } from '../constants';
import StoriesTray from './StoriesTray';
import { firebaseService } from '../services/firebaseService';
import { useSettings } from '../contexts/SettingsContext';

interface FeedScreenProps {
  isLoading: boolean;
  posts: Post[];
  currentUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onOpenProfile: (userName: string) => void;
  onViewPost: (postId: string) => void;
  onReactToPost: (postId: string, emoji: string) => void;
  onStartCreatePost: (props?: any) => void;
  onRewardedAdClick: (campaign: Campaign) => void;
  onAdViewed: (campaignId: string) => void;
  onAdClick: (post: Post) => void;
  onStartComment: (postId: string, commentToReplyTo?: Comment) => void;
  onSharePost: (post: Post) => void;
  onOpenPhotoViewer: (post: Post) => void;
  
  onCommandProcessed: () => void;
  scrollState: ScrollState;
  onSetScrollState: (state: ScrollState) => void;
  onNavigate: (view: AppView, props?: any) => void;
  friends: User[];
  setSearchResults: (results: User[]) => void;
}

const FeedScreen: React.FC<FeedScreenProps> = ({
    isLoading, posts: initialPosts, currentUser, onSetTtsMessage, lastCommand, onOpenProfile,
    onViewPost, onReactToPost, onStartCreatePost, onRewardedAdClick, onAdViewed,
    onAdClick, onCommandProcessed, scrollState, onSetScrollState, onNavigate, friends, setSearchResults,
    onStartComment, onSharePost, onOpenPhotoViewer
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [adInjected, setAdInjected] = useState(false);
  const [currentPostIndex, setCurrentPostIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rewardedCampaign, setRewardedCampaign] = useState<Campaign | null>(null);
  const [storiesByAuthor, setStoriesByAuthor] = useState<Awaited<ReturnType<typeof geminiService.getStories>>>([]);
  
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { language } = useSettings();
  
  const isInitialLoad = useRef(true);
  const isProgrammaticScroll = useRef(false);
  const currentPostIndexRef = useRef(currentPostIndex);
  currentPostIndexRef.current = currentPostIndex;

  useEffect(() => {
    setPosts(initialPosts);
    setAdInjected(false); // Reset ad injection when initial posts change
  }, [initialPosts]);

  const fetchRewardedCampaign = useCallback(async () => {
      const camp = await geminiService.getRandomActiveCampaign();
      setRewardedCampaign(camp);
  }, []);
  
  const fetchStories = useCallback(async () => {
      const realStories = await geminiService.getStories(currentUser.id);
      const adStory = await firebaseService.getInjectableStoryAd(currentUser);
  
      if (adStory) {
          const adStoryGroup = {
              author: adStory.author,
              stories: [adStory],
              allViewed: false, // Doesn't apply to ads
          };
          // Inject the ad story at the second position
          const combinedStories = [...realStories];
          combinedStories.splice(1, 0, adStoryGroup);
          setStoriesByAuthor(combinedStories);
      } else {
          setStoriesByAuthor(realStories);
      }
  }, [currentUser]);

  useEffect(() => {
    if (!isLoading && posts.length > 0 && isInitialLoad.current) {
      onSetTtsMessage(getTtsPrompt('feed_loaded', language));
    }
  }, [posts.length, isLoading, onSetTtsMessage, language]);
  
  useEffect(() => {
    if (!isLoading) {
        fetchRewardedCampaign();
        fetchStories();
    }
  }, [isLoading, fetchRewardedCampaign, fetchStories]);

  useEffect(() => {
    const injectAd = async () => {
        if (!isLoading && !adInjected && posts.length > 2) {
            setAdInjected(true);
            const adPost = await firebaseService.getInjectableAd(currentUser);
            if (adPost) {
                const newPosts = [...posts];
                const injectionIndex = 3; 
                newPosts.splice(injectionIndex, 0, adPost);
                setPosts(newPosts);
            }
        }
    };
    injectAd();
  }, [isLoading, posts, adInjected, currentUser]);

  useEffect(() => {
    const scrollContainer = feedContainerRef.current;
    if (!scrollContainer || scrollState === 'none') {
        return;
    }

    let animationFrameId: number;

    const animateScroll = () => {
        if (scrollState === 'down') {
            scrollContainer.scrollTop += 2;
        } else if (scrollState === 'up') {
            scrollContainer.scrollTop -= 2;
        }
        animationFrameId = requestAnimationFrame(animateScroll);
    };

    animationFrameId = requestAnimationFrame(animateScroll);

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [scrollState]);
  
  const handleCommand = useCallback(async (command: string) => {
    try {
        const userNamesOnScreen = posts.map(p => p.isSponsored ? p.sponsorName as string : p.author.name);
        const allContextNames = [...userNamesOnScreen, ...friends.map(f => f.name)];
        const intentResponse = await geminiService.processIntent(command, { userNames: [...new Set(allContextNames)] });
        
        const { intent, slots } = intentResponse;

        switch (intent) {
          case 'intent_next_post':
            isProgrammaticScroll.current = true;
            setCurrentPostIndex(prev => (prev < 0 ? 0 : (prev + 1) % posts.length));
            setIsPlaying(true);
            break;
          case 'intent_previous_post':
            isProgrammaticScroll.current = true;
            setCurrentPostIndex(prev => (prev > 0 ? prev - 1 : posts.length - 1));
            setIsPlaying(true);
            break;
          case 'intent_play_post':
            if (currentPostIndex === -1 && posts.length > 0) {
                isProgrammaticScroll.current = true;
                setCurrentPostIndex(0);
            }
            setIsPlaying(true);
            break;
          case 'intent_pause_post':
            setIsPlaying(false);
            break;
          case 'intent_like':
            if (slots?.target_name) {
                const targetName = slots.target_name as string;
                const postToLike = posts.find(p => !p.isSponsored && p.author.name === targetName);
                if (postToLike) {
                    onReactToPost(postToLike.id, '👍');
                } else {
                    onSetTtsMessage(`I couldn't find a post by ${targetName} to like.`);
                }
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
              onReactToPost(posts[currentPostIndex].id, '👍');
            }
            break;
          case 'intent_share':
            if (currentPostIndex !== -1 && posts[currentPostIndex]) {
                onSharePost(posts[currentPostIndex]);
            } else {
                onSetTtsMessage("Please select a post to share by playing it or navigating to it.");
            }
            break;
          case 'intent_comment':
          case 'intent_view_comments':
          case 'intent_view_comments_by_author':
            if (slots?.target_name) {
                const targetName = slots.target_name as string;
                const postToView = posts.find(p => !p.isSponsored && p.author.name === targetName);
                if (postToView) {
                    onViewPost(postToView.id);
                } else {
                    onSetTtsMessage(`I can't find a post by ${targetName} to view comments on.`);
                }
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
                onViewPost(posts[currentPostIndex].id);
            }
            break;
          case 'intent_add_text_to_story':
            if (slots?.text) {
                onNavigate(AppView.CREATE_STORY, { initialText: slots.text as string });
            }
            break;
          case 'intent_create_story':
              onNavigate(AppView.CREATE_STORY);
              break;
          case 'intent_open_profile':
            if (slots?.target_name) {
              onOpenProfile(slots.target_name as string);
            } else if (currentPostIndex !== -1 && posts[currentPostIndex] && !posts[currentPostIndex].isSponsored) {
                onOpenProfile(posts[currentPostIndex].author.name);
            }
            break;
          case 'intent_create_post':
              onStartCreatePost();
              break;
          case 'intent_create_voice_post':
              onStartCreatePost({ startRecording: true });
              break;
          case 'intent_open_feed':
              onNavigate(AppView.FEED);
              break;
          case 'intent_open_ads_center':
              onNavigate(AppView.ADS_CENTER);
              break;
          case 'intent_open_friends_page':
              onNavigate(AppView.FRIENDS);
              break;
          case 'intent_open_messages':
              onNavigate(AppView.CONVERSATIONS);
              break;
          case 'intent_open_settings':
              onNavigate(AppView.SETTINGS);
              break;
          case 'intent_open_rooms_hub':
              onNavigate(AppView.ROOMS_HUB);
              break;
          case 'intent_open_audio_rooms':
              onNavigate(AppView.ROOMS_LIST);
              break;
          case 'intent_open_video_rooms':
              onNavigate(AppView.VIDEO_ROOMS_LIST);
              break;
          case 'intent_reload_page':
              onSetTtsMessage("Reloading your feed...");
              fetchRewardedCampaign();
              break;
          case 'intent_search_user':
            if (slots?.target_name) {
                const query = slots.target_name as string;
                const results = await geminiService.searchUsers(query);
                setSearchResults(results);
                onNavigate(AppView.SEARCH_RESULTS, { query });
            }
            break;
          case 'intent_scroll_down':
              onSetScrollState('down');
              break;
          case 'intent_scroll_up':
              onSetScrollState('up');
              break;
          case 'intent_stop_scroll':
              onSetScrollState('none');
              break;
          case 'intent_help':
              onSetTtsMessage(getTtsPrompt('feed_loaded', language));
              break;
          default:
              onSetTtsMessage(getTtsPrompt('error_generic', language));
              break;
        }
    } catch (error) {
        console.error("Error processing command in FeedScreen:", error);
        onSetTtsMessage(getTtsPrompt('error_generic', language));
    } finally {
        onCommandProcessed();
    }
  }, [
      posts, currentPostIndex, friends, onOpenProfile, onReactToPost, onViewPost, onSetTtsMessage, onStartCreatePost, 
      onNavigate, onSetScrollState, setSearchResults, onCommandProcessed, fetchRewardedCampaign, onSharePost, language
  ]);


  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0 || !isProgrammaticScroll.current) return;

    const cardElement = postRefs.current[currentPostIndex];
    if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const scrollTimeout = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 1000); 
        
        return () => clearTimeout(scrollTimeout);
    }
  }, [currentPostIndex, posts]);

  useEffect(() => {
    if (isInitialLoad.current || posts.length === 0 || currentPostIndex < 0) return;
    
    const activePost = posts[currentPostIndex];
    if (activePost?.isSponsored && activePost.campaignId) {
        onAdViewed(activePost.campaignId);
    }
  }, [currentPostIndex, posts, onAdViewed]);

  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (isProgrammaticScroll.current) return;

            const intersectingEntries = entries.filter(entry => entry.isIntersecting);
            if (intersectingEntries.length > 0) {
                const mostVisibleEntry = intersectingEntries.reduce((prev, current) => 
                    prev.intersectionRatio > current.intersectionRatio ? prev : current
                );
                
                const indexStr = (mostVisibleEntry.target as HTMLElement).dataset.index;
                if (indexStr) {
                    const index = parseInt(indexStr, 10);
                    if (currentPostIndexRef.current !== index) {
                         setCurrentPostIndex(index);
                         setIsPlaying(false);
                    }
                }
            }
        },
        { 
            root: feedContainerRef.current,
            threshold: 0.6, 
        }
    );

    const currentPostRefs = postRefs.current;
    currentPostRefs.forEach(ref => {
        if (ref) observer.observe(ref);
    });

    return () => {
        currentPostRefs.forEach(ref => {
            if (ref) observer.unobserve(ref);
        });
    };
  }, [posts]);


  useEffect(() => {
    if (posts.length > 0 && !isLoading && isInitialLoad.current) {
        isInitialLoad.current = false;
    }
  }, [posts, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6">
          <SkeletonPostCard />
          <SkeletonPostCard />
          <SkeletonPostCard />
      </div>
    );
  }

  return (
    <div ref={feedContainerRef} className="w-full max-w-lg mx-auto flex flex-col items-center gap-6">
        <StoriesTray 
            currentUser={currentUser}
            storiesByAuthor={storiesByAuthor}
            onCreateStory={() => onNavigate(AppView.CREATE_STORY)}
            onViewStories={(initialUserIndex) => onNavigate(AppView.STORY_VIEWER, { storiesByAuthor, initialUserIndex })}
        />
        <CreatePostWidget 
            user={currentUser} 
            onStartCreatePost={onStartCreatePost}
        />
        <div className="w-full border-t border-lime-500/20" />
        <RewardedAdWidget campaign={rewardedCampaign} onAdClick={onRewardedAdClick} />
        {posts.filter(Boolean).map((post, index) => (
            <div 
                key={`${post.id}-${index}`} 
                className="w-full"
                ref={el => { postRefs.current[index] = el; }}
                data-index={index}
            >
                <PostCard 
                    post={post} 
                    currentUser={currentUser}
                    isActive={index === currentPostIndex}
                    isPlaying={isPlaying && index === currentPostIndex}
                    onPlayPause={() => {
                        if (post.isSponsored && (post.videoUrl || post.imageUrl)) return;
                        if (index === currentPostIndex) {
                            setIsPlaying(p => !p)
                        } else {
                            isProgrammaticScroll.current = true;
                            setCurrentPostIndex(index);
                            setIsPlaying(true);
                        }
                    }}
                    onReact={onReactToPost}
                    onViewPost={onViewPost}
                    onAuthorClick={onOpenProfile}
                    onAdClick={onAdClick}
                    onStartComment={onStartComment}
                    onSharePost={onSharePost}
                    onOpenPhotoViewer={onOpenPhotoViewer}
                />
            </div>
        ))}
    </div>
  );
};

export default FeedScreen;
