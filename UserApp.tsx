
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// FIX: ScrollState enum needs to be used for state initialization and updates.
import { AppView, User, VoiceState, Post, Comment, ScrollState, Notification, Campaign, Group, Story, Conversation, Call } from './types';
import AuthScreen from './components/AuthScreen';
import FeedScreen from './components/FeedScreen';
import ExploreScreen from './components/ExploreScreen';
import ReelsScreen from './components/ReelsScreen';
import CreatePostScreen from './components/CreatePostScreen';
import CreateReelScreen from './components/CreateReelScreen';
import CreateCommentScreen from './components/CreateCommentScreen';
import { ProfileScreen } from './components/ProfileScreen';
import SettingsScreen from './components/SettingsScreen';
import PostDetailScreen from './components/PostDetailScreen';
import FriendsScreen from './components/FriendsScreen';
import SearchResultsScreen from './components/SearchResultsScreen';
import VoiceCommandInput from './components/VoiceCommandInput';
import NotificationPanel from './components/NotificationPanel';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import AdModal from './components/AdModal';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { IMAGE_GENERATION_COST, REWARD_AD_COIN_VALUE, getTtsPrompt } from './constants';
import ConversationsScreen from './components/ConversationsScreen';
import AdsScreen from './components/AdsScreen';
import CampaignViewerModal from './components/CampaignViewerModal';
import MobileBottomNav from './components/MobileBottomNav';
import RoomsHubScreen from './components/RoomsHubScreen';
import RoomsListScreen from './components/RoomsListScreen';
import LiveRoomScreen from './components/LiveRoomScreen';
import VideoRoomsListScreen from './components/VideoRoomsListScreen';
import LiveVideoRoomScreen from './components/LiveVideoRoomScreen';
import GroupsHubScreen from './components/GroupsHubScreen';
import GroupPageScreen from './components/GroupPageScreen';
import ManageGroupScreen from './components/ManageGroupScreen';
import GroupChatScreen from './components/GroupChatScreen';
import GroupEventsScreen from './components/GroupEventsScreen';
import CreateEventScreen from './components/CreateEventScreen';
import CreateStoryScreen from './components/CreateStoryScreen';
import StoryViewerScreen from './components/StoryViewerScreen';
import StoryPrivacyScreen from './components/StoryPrivacyScreen';
import GroupInviteScreen from './components/GroupInviteScreen';
import ContactsPanel from './components/ContactsPanel';
import ShareModal from './components/ShareModal';
import LeadFormModal from './components/LeadFormModal';
import ImageModal from './components/ImageModal';
import { useSettings } from './contexts/SettingsContext';
import ChatManager from './components/ChatManager';
import IncomingCallModal from './components/IncomingCallModal';
import CallScreen from './components/CallScreen';


interface ViewState {
  view: AppView;
  props?: any;
}

const MenuItem: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    onClick: () => void;
    badge?: string | number;
}> = ({ iconName, label, onClick, badge }) => (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 text-left text-lg text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
        <Icon name={iconName} className="w-7 h-7 text-gray-500" />
        <span className="flex-grow">{label}</span>
        {badge !== undefined && Number(badge) > 0 && <span className="text-sm font-bold bg-red-500 text-white rounded-full px-2 py-0.5">{badge}</span>}
        {badge !== undefined && Number(badge) === 0 && <span className="text-sm font-bold text-yellow-500">{badge}</span>}
    </button>
);

const MobileMenuScreen: React.FC<{
  currentUser: User;
  onNavigate: (view: AppView, props?: any) => void;
  onLogout: () => void;
  friendRequestCount: number;
}> = ({ currentUser, onNavigate, onLogout, friendRequestCount }) => {
    return (
        <div className="h-full w-full overflow-y-auto p-4 bg-slate-100 text-gray-800">
            <div className="max-w-md mx-auto">
                <button 
                    onClick={() => onNavigate(AppView.PROFILE, { username: currentUser.username })}
                    className="w-full flex items-center gap-4 p-4 mb-6 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-200"
                >
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                        <p className="text-gray-500">View your profile</p>
                    </div>
                </button>

                <div className="space-y-2 bg-white p-2 rounded-lg border border-gray-200">
                    <MenuItem 
                        iconName="users" 
                        label="Friends" 
                        onClick={() => onNavigate(AppView.FRIENDS)}
                        badge={friendRequestCount}
                    />
                    <MenuItem 
                        iconName="coin" 
                        label="Voice Coins" 
                        onClick={() => {}}
                        badge={currentUser.voiceCoins || 0}
                    />
                     <MenuItem 
                        iconName="settings" 
                        label="Settings" 
                        onClick={() => onNavigate(AppView.SETTINGS)}
                    />
                    <MenuItem 
                        iconName="users-group-solid" 
                        label="Groups" 
                        onClick={() => onNavigate(AppView.GROUPS_HUB)}
                    />
                    <MenuItem 
                        iconName="briefcase" 
                        label="Ads Center" 
                        onClick={() => onNavigate(AppView.ADS_CENTER)}
                    />
                    <MenuItem 
                        iconName="chat-bubble-group" 
                        label="Rooms" 
                        onClick={() => onNavigate(AppView.ROOMS_HUB)}
                    />
                </div>

                <div className="mt-8 border-t border-gray-200 pt-4">
                     <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 text-left text-lg text-red-600 hover:bg-red-500/10 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


const UserApp: React.FC = () => {
  const [viewStack, setViewStack] = useState<ViewState[]>([{ view: AppView.AUTH }]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [globalAuthError, setGlobalAuthError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reelsPosts, setReelsPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [campaignForAd, setCampaignForAd] = useState<Campaign | null>(null);
  const [viewingAd, setViewingAd] = useState<Post | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [ttsMessage, setTtsMessage] = useState<string>('Say a command...');
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  // FIX: Initialize scrollState with the enum member instead of a string literal.
  const [scrollState, setScrollState] = useState<ScrollState>(ScrollState.NONE);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [commandInputValue, setCommandInputValue] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [navigateToGroupId, setNavigateToGroupId] = useState<string | null>(null);
  const [initialDeepLink, setInitialDeepLink] = useState<ViewState | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [leadFormPost, setLeadFormPost] = useState<Post | null>(null);
  const [viewerPost, setViewerPost] = useState<Post | null>(null);
  const [isLoadingViewerPost, setIsLoadingViewerPost] = useState(false);
  const { language } = useSettings();

  const [activeChats, setActiveChats] = useState<User[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<Set<string>>(new Set());
  const [chatUnreadCounts, setChatUnreadCounts] = useState<Record<string, number>>({});
  const [isChatRecording, setIsChatRecording] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  
  const userRef = useRef(user);
  userRef.current = user;
  
  const activeChatsRef = useRef(activeChats);
  activeChatsRef.current = activeChats;
  const conversationsRef = useRef<Conversation[]>([]);
  const previousLastMessageIdsRef = useRef(new Map<string, string>());
  const isFirstConversationLoad = useRef(true);

  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // To hold the active speech recognition instance
  const viewerPostUnsubscribe = useRef<(() => void) | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const currentView = viewStack[viewStack.length - 1];
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const userFriendIds = useMemo(() => user?.friendIds || [], [user?.friendIds]);
  const userBlockedIds = useMemo(() => user?.blockedUserIds || [], [user?.blockedUserIds]);
  
  const friendRequestCount = useMemo(() => {
      return friendRequests.filter(r => r && r.id && !userFriendIds.includes(r.id)).length;
  }, [friendRequests, userFriendIds]);


  const navigate = useCallback((view: AppView, props: any = {}) => {
    setNotificationPanelOpen(false);
    setProfileMenuOpen(false);
    if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
    }
    setViewStack(stack => [...stack, { view, props }]);
  }, []);

  const goBack = useCallback(() => {
    setViewStack(stack => {
        if (stack.length > 1) {
            return stack.slice(0, -1);
        }
        return stack;
    });
  }, []);
  
  const handleOpenConversation = useCallback(async (peer: User) => {
    if (!user) return;
    await firebaseService.ensureChatDocumentExists(user, peer);
    
    const isMobile = window.innerWidth < 768;

    setActiveChats(prev => {
        const existing = prev.filter(c => c.id !== peer.id);
        const newChats = [...existing, peer];
        
        if (isMobile) {
            return [peer]; // On mobile, only allow one chat to be fully open
        }

        if (newChats.length > 3) {
            return newChats.slice(newChats.length - 3);
        }
        return newChats;
    });

    setMinimizedChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(peer.id);
        return newSet;
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    isFirstConversationLoad.current = true; 

    const unsubscribe = firebaseService.listenToConversations(user.id, (newConvos) => {
        const convoWithNewMessage = newConvos.find(convo => {
            if (!convo.lastMessage || convo.lastMessage.senderId === user.id) {
                return false;
            }
            const previousId = previousLastMessageIdsRef.current.get(convo.peer.id);
            return !previousId || previousId !== convo.lastMessage.id;
        });

        if (convoWithNewMessage) {
            const isAlreadyActive = activeChatsRef.current.some(c => c.id === convoWithNewMessage.peer.id);
            const isMobile = window.innerWidth < 768;

            // Only auto-open if it's NOT the initial load and NOT on a mobile device.
            if (!isAlreadyActive && !isFirstConversationLoad.current && !isMobile) {
                handleOpenConversation(convoWithNewMessage.peer);
            }
        }
        
        conversationsRef.current = newConvos;
        newConvos.forEach(c => {
            if (c.lastMessage) {
                previousLastMessageIdsRef.current.set(c.peer.id, c.lastMessage.id);
            }
        });

        // Set this flag to false after the first execution.
        if (isFirstConversationLoad.current) {
            isFirstConversationLoad.current = false;
        }

        const counts: Record<string, number> = {};
        newConvos.forEach(convo => {
            const chatId = firebaseService.getChatId(user.id, convo.peer.id);
            counts[chatId] = convo.unreadCount || 0;
        });
        setChatUnreadCounts(counts);
    });

    return () => {
        unsubscribe();
    };
}, [user, handleOpenConversation]);

  useEffect(() => {
    const hash = window.location.hash;
    const postMatch = hash.match(/^#\/post\/([\w-]+)/);
    if (postMatch && postMatch[1]) {
        setInitialDeepLink({ view: AppView.POST_DETAILS, props: { postId: postMatch[1] } });
    }
  }, []);

  const handleClosePhotoViewer = useCallback(() => {
    if (viewerPostUnsubscribe.current) {
        viewerPostUnsubscribe.current();
        viewerPostUnsubscribe.current = null;
    }
    setViewerPost(null);
    setIsLoadingViewerPost(false);
  }, []);

  const handleLogout = useCallback(async () => {
    const currentUserForLogout = userRef.current;
    if (currentUserForLogout) {
        await firebaseService.signOutUser(currentUserForLogout.id);
    } else {
        await firebaseService.signOutUser(null);
    }
  }, []);
  
  useEffect(() => {
      const handleBeforeUnload = () => {
          const currentUserForUnload = userRef.current;
          if (currentUserForUnload) {
              firebaseService.updateUserOnlineStatus(currentUserForUnload.id, 'offline');
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
      };
  }, []);

  // Effect 1: Handles authentication state changes. Only sets the current user ID or handles logout.
  useEffect(() => {
    const unsubscribeAuth = firebaseService.onAuthStateChanged((userAuth) => {
        setCurrentUserId(userAuth?.id || null);
        if (!userAuth) {
            setUser(null);
            setPosts([]);
            setFriends([]);
            setFriendRequests([]);
            setGroups([]);
            setNotifications([]);
            setViewStack([{ view: AppView.AUTH }]);
            setIsAuthLoading(false);
        } else {
            setIsAuthLoading(true);
        }
    });
    return () => unsubscribeAuth();
  }, []);

  // Effect 2: Listens to the current user's profile document once we have a user ID.
  useEffect(() => {
      if (!currentUserId) return;

      let isFirstLoad = true;
      firebaseService.updateUserOnlineStatus(currentUserId, 'online');

      const unsubscribeUserDoc = firebaseService.listenToCurrentUser(currentUserId, async (userProfile) => {
          if (userProfile && !userProfile.isDeactivated && !userProfile.isBanned) {
              setUser(userProfile);

              if (isFirstLoad) {
                  if (!initialDeepLink) {
                      setTtsMessage(getTtsPrompt('login_success', language, { name: userProfile.name }));
                  }
                  if (initialDeepLink) {
                      setViewStack([initialDeepLink]);
                      setInitialDeepLink(null);
                  } else if (currentView?.view === AppView.AUTH) {
                      setViewStack([{ view: AppView.FEED }]);
                  }
                  isFirstLoad = false;
              }
          } else {
              if (userProfile?.isDeactivated) console.log(`User ${currentUserId} is deactivated. Signing out.`);
              if (userProfile?.isBanned) console.log(`User ${currentUserId} is banned. Signing out.`);
              handleLogout();
          }
          setIsAuthLoading(false);
      });
      
      return () => unsubscribeUserDoc();
  }, [currentUserId, initialDeepLink, language, handleLogout]);

  // Effect 3: Manages data subscriptions that depend only on the user's ID.
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribes: (()=>void)[] = [];
    
    setIsLoadingReels(true);
    const unsubscribeReelsPosts = firebaseService.listenToReelsPosts((newReelsPosts) => {
        setReelsPosts(newReelsPosts);
        setIsLoadingReels(false);
    });
    unsubscribes.push(unsubscribeReelsPosts);
    
    const unsubscribeFriendRequests = firebaseService.listenToFriendRequests(user.id, setFriendRequests);
    unsubscribes.push(unsubscribeFriendRequests);

    const unsubscribeNotifications = firebaseService.listenToNotifications(user.id, setNotifications);
    unsubscribes.push(unsubscribeNotifications);
    
    const unsubscribeCalls = firebaseService.listenForIncomingCalls(user.id, (call) => {
        setIncomingCall(call);
    });
    unsubscribes.push(unsubscribeCalls);

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
  }, [user?.id]);

  // Effect 4: Manages data subscriptions that depend on friend/block lists.
  // This effect will ONLY re-run if the content of friendIds or blockedUserIds changes.
  useEffect(() => {
    if (!user?.id) return;

    let unsubscribes: (()=>void)[] = [];
    
    setIsLoadingFeed(true);
    // This listener for the feed is efficient and uses the friend/block lists in its query logic.
    const unsubscribePosts = firebaseService.listenToFeedPosts(user.id, userFriendIds, userBlockedIds, (feedPosts) => {
        setPosts(feedPosts);
        setIsLoadingFeed(false);
    });
    unsubscribes.push(unsubscribePosts);
    
    // --- POLLING LOGIC FOR FRIENDS' ONLINE STATUS ---
    // This replaces the expensive real-time listener to prevent quota issues.
    let isMounted = true;
    const fetchFriends = async () => {
        if (!user?.id) return;
        try {
            const friendsData = await firebaseService.getFriends(user.id);
            if (isMounted) {
                setFriends(friendsData);
            }
        } catch (error) {
            console.error("Failed to fetch friends list:", error);
        }
    };

    fetchFriends(); // Initial fetch
    const friendsInterval = setInterval(fetchFriends, 5000); // Poll every 5 seconds
    
    return () => {
        isMounted = false;
        clearInterval(friendsInterval);
        unsubscribes.forEach(unsub => unsub());
    };
  }, [user?.id, JSON.stringify(userFriendIds), JSON.stringify(userBlockedIds)]);


  useEffect(() => {
    setTtsMessage(getTtsPrompt('welcome', language));
  }, [language]);

  
  useEffect(() => {
    if (!user && !isAuthLoading && currentView?.view !== AppView.AUTH) {
        setViewStack([{ view: AppView.AUTH }]);
    }
  }, [user, isAuthLoading, currentView]);

  

  const handleCloseChat = useCallback((peerId: string) => {
      setActiveChats(prev => prev.filter(c => c.id !== peerId));
      setMinimizedChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          return newSet;
      });
  }, []);

  const handleMinimizeToggle = useCallback((peerId: string) => {
      setMinimizedChats(prev => {
          const newSet = new Set(prev);
          if (newSet.has(peerId)) {
              newSet.delete(peerId);
          } else {
              newSet.add(peerId);
          }
          return newSet;
      });
  }, []);

  const handleCommand = useCallback((command: string) => {
    setVoiceState(VoiceState.PROCESSING);
    // FIX: Use the ScrollState enum member for state updates.
    setScrollState(ScrollState.NONE);
    setLastCommand(command);
    setCommandInputValue('');
  }, []);

  const handleCommandProcessed = useCallback(() => {
    setLastCommand(null);
    setVoiceState(VoiceState.IDLE);
  }, []);

  const handleMicClick = useCallback(() => {
    if (isChatRecording) {
      setTtsMessage("In-chat voice message is currently recording.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTtsMessage(getTtsPrompt('error_no_speech_rec', language));
      return;
    }

    if (voiceState === VoiceState.LISTENING) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    if (voiceState === VoiceState.PROCESSING) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'bn-BD, en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState(VoiceState.LISTENING);
      setCommandInputValue(''); 
      setTtsMessage("Listening...");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceState(currentVoiceState => {
        if (currentVoiceState === VoiceState.LISTENING) { 
            return VoiceState.IDLE;
        }
        return currentVoiceState;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setTtsMessage(getTtsPrompt('error_mic_permission', language));
      } else {
        setTtsMessage(getTtsPrompt('error_generic', language));
      }
    };

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      handleCommand(command);
    };

    recognition.start();
  }, [voiceState, handleCommand, language, isChatRecording]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
            setNotificationPanelOpen(false);
        }
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setProfileMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleToggleNotifications = async () => {
      const isOpen = !isNotificationPanelOpen;
      setNotificationPanelOpen(isOpen);
      if (isOpen && user) {
          const unreadNotifications = notifications.filter(n => !n.read);
          if (unreadNotifications.length > 0) {
              await firebaseService.markNotificationsAsRead(user.id, unreadNotifications);
          }
      }
  }

  const handleNotificationClick = (notification: Notification) => {
    setNotificationPanelOpen(false);
    
    switch(notification.type) {
        case 'mention':
        case 'like':
        case 'comment':
            if (notification.post?.id) {
                navigate(AppView.POST_DETAILS, { postId: notification.post.id });
            }
            break;
        case 'friend_request':
            navigate(AppView.FRIENDS, { initialTab: 'requests' });
            break;
        case 'friend_request_approved':
            if (notification.user?.username) {
                setTtsMessage(`${notification.user.name} accepted your friend request.`);
                navigate(AppView.PROFILE, { username: notification.user.username });
            }
            break;
        case 'group_post':
        case 'group_request_approved':
            if (notification.groupId) {
                navigate(AppView.GROUP_PAGE, { groupId: notification.groupId });
            }
            break;
        case 'group_join_request':
            if (notification.groupId) {
                navigate(AppView.MANAGE_GROUP, { groupId: notification.groupId, initialTab: 'requests' });
            }
            break;
        case 'campaign_approved':
        case 'campaign_rejected':
            navigate(AppView.ADS_CENTER);
            break;
        case 'admin_announcement':
        case 'admin_warning':
            if (notification.message) {
                setTtsMessage(notification.message);
                alert(`[Admin Message] ${notification.message}`);
            }
            break;
        default:
            console.warn("Unhandled notification type:", notification.type);
            break;
    }
  }
  
  const handleRewardedAdClick = async (campaign: Campaign) => {
      setCampaignForAd(campaign);
      setIsShowingAd(true);
  };

  const handleAdViewed = (campaignId: string) => {
      firebaseService.trackAdView(campaignId);
  };

  const handleAdComplete = async (campaignId?: string) => {
      if (!user) return;
      
      setIsShowingAd(false);
      setCampaignForAd(null);

      const success = await geminiService.updateVoiceCoins(user.id, REWARD_AD_COIN_VALUE);

      if (success) {
          setUser(prevUser => {
              if (!prevUser) return null;
              return {
                  ...prevUser,
                  voiceCoins: (prevUser.voiceCoins || 0) + REWARD_AD_COIN_VALUE
              };
          });
          setTtsMessage(getTtsPrompt('reward_claim_success', language, { coins: REWARD_AD_COIN_VALUE }));
          if (campaignId) {
          }
      } else {
          setTtsMessage(getTtsPrompt('transaction_failed', language));
      }
  };

  const handleAdSkip = () => {
    setIsShowingAd(false);
    setCampaignForAd(null);
    setTtsMessage("Ad skipped. No reward was earned.");
  };

  const handleDeductCoinsForImage = async (): Promise<boolean> => {
    if (!user) return false;
    return await geminiService.updateVoiceCoins(user.id, -IMAGE_GENERATION_COST);
  };

  const handleAdClick = async (post: Post) => {
    if (!user || !post.isSponsored || !post.campaignId) return;

    await firebaseService.trackAdClick(post.campaignId);
    
    if (post.allowLeadForm) {
        setTtsMessage(getTtsPrompt('lead_form_opened', language));
        setLeadFormPost(post);
    } else if (post.websiteUrl) {
        setTtsMessage(`Opening link for ${post.sponsorName}...`);
        window.open(post.websiteUrl, '_blank', 'noopener,noreferrer');
    } else if (post.allowDirectMessage && post.sponsorId) {
        const sponsorUser = await firebaseService.getUserProfileById(post.sponsorId);
        if (sponsorUser) {
            setTtsMessage(`Opening conversation with ${sponsorUser.name}.`);
            await handleOpenConversation(sponsorUser);
        } else {
            setTtsMessage(`Could not find sponsor ${post.sponsorName}.`);
        }
    } else if (post.sponsorId) {
        const sponsorUser = await firebaseService.getUserProfileById(post.sponsorId);
        if (sponsorUser) {
            setTtsMessage(`Opening profile for ${sponsorUser.name}.`);
            navigate(AppView.PROFILE, { username: sponsorUser.username });
        } else {
            setTtsMessage(`Could not find sponsor ${post.sponsorName}.`);
        }
    } else {
        setTtsMessage(`Thank you for your interest in ${post.sponsorName}.`);
    }
  };

  const handleLeadSubmit = async (leadData: { name: string, email: string, phone: string }) => {
    if (!user || !leadFormPost || !leadFormPost.campaignId || !leadFormPost.sponsorId) {
        setTtsMessage(getTtsPrompt('lead_form_error', language));
        return;
    }
    
    try {
        await firebaseService.submitLead({
            campaignId: leadFormPost.campaignId,
            sponsorId: leadFormPost.sponsorId,
            userName: leadData.name,
            userEmail: leadData.email,
            userPhone: leadData.phone || undefined,
            createdAt: new Date().toISOString(),
        });
        setLeadFormPost(null);
        setTtsMessage(getTtsPrompt('lead_form_submitted', language));
    } catch (error) {
        console.error("Failed to submit lead:", error);
        setTtsMessage(getTtsPrompt('lead_form_error', language));
    }
  };

  const handleStartCreatePost = (props: any = {}) => {
    navigate(AppView.CREATE_POST, props);
  };
  
  const handlePostCreated = (newPost: Post | null) => {
    goBack();
    setTtsMessage(getTtsPrompt('post_success', language));
  };

  const handleReelCreated = () => {
    goBack();
    setTtsMessage("Your Reel has been posted!");
  };

  const handleStoryCreated = (newStory: Story) => {
    goBack();
    setTtsMessage(getTtsPrompt('story_created', language));
  }
  
  const handleGroupCreated = (newGroup: Group) => {
    navigate(AppView.GROUP_PAGE, { groupId: newGroup.id });
  };

  const handleCurrentUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleUpdateSettings = async (settings: Partial<User>) => {
    if(user) {
        await geminiService.updateProfile(user.id, settings);
        const updatedUser = await geminiService.getUserById(user.id);
        if (updatedUser) setUser(updatedUser);
    }
  };
  
  const handleCommentPosted = (newComment: Comment | null, postId: string) => {
    if (newComment === null) {
        setTtsMessage(getTtsPrompt('comment_suspended', language));
        goBack();
        return;
    }
    setViewStack(stack => [...stack.slice(0, -1), { view: AppView.POST_DETAILS, props: { postId, newlyAddedCommentId: newComment.id } }]);
    setTtsMessage(getTtsPrompt('comment_post_success', language));
  }
  
  const handleReactToPost = async (postId: string, emoji: string) => {
    if (!user) return;
    const success = await firebaseService.reactToPost(postId, user.id, emoji);
    if (!success) {
      setTtsMessage(`Could not react. You may be offline.`);
    }
  };

  const handleReactToComment = async (postId: string, commentId: string, emoji: string) => {
    if (!user) return;
    await firebaseService.reactToComment(postId, commentId, user.id, emoji);
  };

  const handlePostComment = async (postId: string, text: string, parentId: string | null = null) => {
    if (!user || !text.trim()) return;
    if (user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
        setTtsMessage(getTtsPrompt('comment_suspended', language));
        return;
    }
    await firebaseService.createComment(user, postId, { text, parentId });
  };

  const handleEditComment = async (postId: string, commentId: string, newText: string) => {
    if (!user) return;
    await firebaseService.editComment(postId, commentId, newText);
  };
  
  const handleDeleteComment = async (postId: string, commentId: string) => {
      if (!user) return;
      await firebaseService.deleteComment(postId, commentId);
  };

  const handleSharePost = async (post: Post) => {
    const postUrl = `${window.location.origin}${window.location.pathname}#/post/${post.id}`;
    const shareData = {
        title: `Post by ${post.author.name} on VoiceBook`,
        text: post.caption ? (post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '')) : 'Check out this post on VoiceBook!',
        url: postUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            setTtsMessage("Post shared successfully!");
        } catch (err) {
            console.log("Web Share API was cancelled or failed.", err);
        }
    } else {
        setShareModalPost(post);
        setTtsMessage("Share options are now open.");
    }
  };

  const handleOpenPhotoViewer = (post: Post) => {
    if (!post.imageUrl && !post.newPhotoUrl) return;

    if (viewerPostUnsubscribe.current) {
        viewerPostUnsubscribe.current();
        viewerPostUnsubscribe.current = null;
    }
    
    setViewerPost(post);
    setIsLoadingViewerPost(false); 

    if (!post.isSponsored && !post.id.startsWith('ad_')) {
        const unsubscribe = firebaseService.listenToPost(post.id, (updatedPost) => {
            if (updatedPost) {
                setViewerPost(updatedPost);
            } else {
                setTtsMessage("This post is no longer available.");
                handleClosePhotoViewer(); 
            }
        });
        viewerPostUnsubscribe.current = unsubscribe;
    }
  };

  const handleOpenProfile = (username: string) => navigate(AppView.PROFILE, { username });
  const handleViewPost = (postId: string) => navigate(AppView.POST_DETAILS, { postId });
  const handleEditProfile = () => navigate(AppView.SETTINGS, { ttsMessage: getTtsPrompt('settings_opened', language) });
  
  const handleStartComment = (postId: string, commentToReplyTo?: Comment) => {
    if (user?.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
        setTtsMessage(getTtsPrompt('comment_suspended', language));
        return;
    }
    handleClosePhotoViewer(); 
    navigate(AppView.CREATE_COMMENT, { postId, commentToReplyTo });
  };
  
  const handleBlockUser = async (userToBlock: User) => {
      if (!user) return;
      const success = await geminiService.blockUser(user.id, userToBlock.id);
      if (success) {
          setUser(u => u ? { ...u, blockedUserIds: [...u.blockedUserIds, userToBlock.id] } : null);
          setTtsMessage(getTtsPrompt('user_blocked', language, { name: userToBlock.name }));
          goBack();
      }
  };

  const handleUnblockUser = async (userToUnblock: User) => {
      if (!user) return;
      const success = await geminiService.unblockUser(user.id, userToUnblock.id);
      if (success) {
          setUser(u => u ? { ...u, blockedUserIds: u.blockedUserIds.filter(id => id !== userToUnblock.id) } : null);
          setTtsMessage(getTtsPrompt('user_unblocked', language, { name: userToUnblock.name }));
      }
  };

  const handleDeactivateAccount = async () => {
      if (!user) return;
      const success = await geminiService.deactivateAccount(user.id);
      if (success) {
          setTtsMessage(getTtsPrompt('account_deactivated', language));
          handleLogout();
      }
  };

  const handleNavigation = (viewName: 'feed' | 'explore' | 'reels' | 'friends' | 'settings' | 'profile' | 'messages' | 'ads_center' | 'rooms' | 'groups' | 'menu') => {
    setNotificationPanelOpen(false);
    switch(viewName) {
        case 'feed': setViewStack([{ view: AppView.FEED }]); break;
        case 'explore': setViewStack([{ view: AppView.EXPLORE }]); break;
        case 'reels': setViewStack([{ view: AppView.REELS }]); break;
        case 'friends': navigate(AppView.FRIENDS); break;
        case 'settings': navigate(AppView.SETTINGS); break;
        case 'profile': if (user) navigate(AppView.PROFILE, { username: user.username }); break;
        case 'messages': navigate(AppView.CONVERSATIONS); break;
        case 'ads_center': navigate(AppView.ADS_CENTER); break;
        case 'rooms': navigate(AppView.ROOMS_HUB); break;
        case 'groups': navigate(AppView.GROUPS_HUB); break;
        case 'menu': navigate(AppView.MOBILE_MENU); break;
    }
  }
  
  const handleHeaderSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = headerSearchQuery.trim();
    if (!query) return;
    const results = await geminiService.searchUsers(query);
    setSearchResults(results);
    navigate(AppView.SEARCH_RESULTS, { query });
    setHeaderSearchQuery('');
    setIsMobileSearchOpen(false);
  };
  
  const handleAcceptCall = async (call: Call) => {
      await firebaseService.updateCallStatus(call.id, 'active');
      setIncomingCall(null);
      navigate(AppView.CALL_SCREEN, {
          callId: call.id,
          peerUser: call.caller,
          isCaller: false,
      });
  };

  const handleRejectCall = async (call: Call) => {
      await firebaseService.updateCallStatus(call.id, 'declined');
      setIncomingCall(null);
  };

  const renderView = () => {
    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-full text-fuchsia-400">Loading VoiceBook...</div>;
    }
    if (!user) {
        return <AuthScreen 
            onSetTtsMessage={setTtsMessage}
            lastCommand={lastCommand}
            onCommandProcessed={handleCommandProcessed}
            initialAuthError={globalAuthError}
        />;
    }

    const commonScreenProps = {
      currentUser: user,
      onSetTtsMessage: setTtsMessage,
      lastCommand: lastCommand,
      onCommandProcessed: handleCommandProcessed,
      scrollState: scrollState,
      onSetScrollState: setScrollState,
      onGoBack: goBack,
      onNavigate: navigate,
      onOpenProfile: handleOpenProfile,
      onStartComment: handleStartComment,
      onSharePost: handleSharePost,
      onOpenPhotoViewer: handleOpenPhotoViewer,
    };

    switch (currentView.view) {
      case AppView.AUTH:
        return <AuthScreen
            onSetTtsMessage={setTtsMessage}
            lastCommand={lastCommand}
            onCommandProcessed={handleCommandProcessed}
            initialAuthError={globalAuthError}
        />;
      case AppView.FEED:
        return <FeedScreen {...commonScreenProps} posts={posts} isLoading={isLoadingFeed} onReactToPost={handleReactToPost} onStartCreatePost={handleStartCreatePost} onRewardedAdClick={handleRewardedAdClick} onAdClick={handleAdClick} onAdViewed={handleAdViewed} onViewPost={handleViewPost} friends={friends} setSearchResults={setSearchResults} />;
      case AppView.EXPLORE:
        return <ExploreScreen {...commonScreenProps} onReactToPost={handleReactToPost} onViewPost={handleViewPost} />;
      case AppView.REELS:
        return <ReelsScreen {...commonScreenProps} isLoading={isLoadingReels} posts={reelsPosts} onReactToPost={handleReactToPost} onViewPost={handleViewPost} />;
      case AppView.CREATE_POST:
        return <CreatePostScreen {...commonScreenProps} onPostCreated={handlePostCreated} onDeductCoinsForImage={handleDeductCoinsForImage} {...currentView.props} />;
      case AppView.CREATE_REEL:
        return <CreateReelScreen {...commonScreenProps} onReelCreated={handleReelCreated} />;
      case AppView.CREATE_COMMENT:
        return <CreateCommentScreen {...commonScreenProps} user={user} onCommentPosted={handleCommentPosted} {...currentView.props} />;
      case AppView.PROFILE:
        return <ProfileScreen {...commonScreenProps} onOpenConversation={handleOpenConversation} onEditProfile={handleEditProfile} onBlockUser={handleBlockUser} onCurrentUserUpdate={handleCurrentUserUpdate} onPostCreated={handlePostCreated} {...currentView.props} />;
      case AppView.SETTINGS:
        return <SettingsScreen {...commonScreenProps} onUpdateSettings={handleUpdateSettings} onUnblockUser={handleUnblockUser} onDeactivateAccount={handleDeactivateAccount} />;
      case AppView.POST_DETAILS:
        return <PostDetailScreen {...commonScreenProps} onReactToPost={handleReactToPost} onReactToComment={handleReactToComment} onPostComment={handlePostComment} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} {...currentView.props} />;
      case AppView.FRIENDS:
        return <FriendsScreen {...commonScreenProps} requests={friendRequests} friends={friends} onOpenConversation={handleOpenConversation} {...currentView.props} />;
      case AppView.SEARCH_RESULTS:
        return <SearchResultsScreen {...commonScreenProps} results={searchResults} {...currentView.props} />;
      case AppView.CONVERSATIONS:
        return <ConversationsScreen {...commonScreenProps} onOpenConversation={handleOpenConversation} />;
      case AppView.ADS_CENTER:
        return <AdsScreen {...commonScreenProps} />;
      case AppView.ROOMS_HUB:
        return <RoomsHubScreen {...commonScreenProps} />;
      case AppView.ROOMS_LIST:
        return <RoomsListScreen {...commonScreenProps} />;
      case AppView.LIVE_ROOM:
        return <LiveRoomScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.VIDEO_ROOMS_LIST:
        return <VideoRoomsListScreen {...commonScreenProps} />;
      case AppView.LIVE_VIDEO_ROOM:
        return <LiveVideoRoomScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.GROUPS_HUB:
        return <GroupsHubScreen {...commonScreenProps} groups={groups} onGroupCreated={handleGroupCreated} />;
      case AppView.GROUP_PAGE:
        return <GroupPageScreen {...commonScreenProps} onStartCreatePost={handleStartCreatePost} {...currentView.props} />;
      case AppView.MANAGE_GROUP:
        return <ManageGroupScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.GROUP_CHAT:
        return <GroupChatScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.GROUP_EVENTS:
        return <GroupEventsScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.CREATE_EVENT:
        return <CreateEventScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.CREATE_STORY:
        return <CreateStoryScreen {...commonScreenProps} onStoryCreated={handleStoryCreated} {...currentView.props} />;
      case AppView.STORY_VIEWER:
        return <StoryViewerScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.STORY_PRIVACY:
        return <StoryPrivacyScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.GROUP_INVITE:
        return <GroupInviteScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.CALL_SCREEN:
        return <CallScreen {...commonScreenProps} {...currentView.props} />;
      case AppView.MOBILE_MENU:
        return <MobileMenuScreen currentUser={user} onNavigate={navigate} onLogout={handleLogout} friendRequestCount={friendRequestCount} />;
      default:
        return <FeedScreen {...commonScreenProps} posts={posts} isLoading={isLoadingFeed} onReactToPost={handleReactToPost} onStartCreatePost={handleStartCreatePost} onRewardedAdClick={handleRewardedAdClick} onAdClick={handleAdClick} onAdViewed={handleAdViewed} onViewPost={handleViewPost} friends={friends} setSearchResults={setSearchResults} />;
    }
  };
  
  const isFullScreenView = [
      AppView.LIVE_ROOM,
      AppView.LIVE_VIDEO_ROOM,
      AppView.CALL_SCREEN,
      AppView.CREATE_STORY,
      AppView.CREATE_REEL,
      AppView.STORY_VIEWER
  ].includes(currentView.view);
  
  if (!user) {
    return (
      <div className="h-screen w-screen bg-transparent flex flex-col">
        <main className="flex-grow flex items-center justify-center overflow-hidden">
            <div className="h-full w-full">
                {renderView()}
            </div>
        </main>
        <footer className="flex-shrink-0">
            <VoiceCommandInput
                onSendCommand={handleCommand}
                voiceState={voiceState}
                onMicClick={handleMicClick}
                value={commandInputValue}
                onValueChange={setCommandInputValue}
                placeholder={ttsMessage}
                isChatRecording={isChatRecording}
            />
        </footer>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen bg-transparent flex font-sans text-slate-100 overflow-hidden">
      {!isFullScreenView && (
        <Sidebar
          currentUser={user}
          onNavigate={handleNavigation}
          friendRequestCount={friendRequestCount}
          activeView={currentView.view}
          voiceCoins={user.voiceCoins || 0}
          voiceState={voiceState}
          onMicClick={handleMicClick}
          isChatRecording={isChatRecording}
        />
      )}
      
      <main className="flex-grow overflow-hidden relative flex flex-col">
        {/* Header */}
        {!isFullScreenView && (
            <header className="flex-shrink-0 h-16 bg-black/20 backdrop-blur-md border-b border-fuchsia-500/20 z-30 hidden md:flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    {viewStack.length > 1 && (
                         <button onClick={goBack} className="p-2 -ml-2 rounded-full text-fuchsia-400 hover:bg-slate-800">
                            <Icon name="back" className="w-6 h-6" />
                        </button>
                    )}
                     <form onSubmit={handleHeaderSearchSubmit} className="relative w-96">
                        <input type="search" placeholder="Search VoiceBook..." value={headerSearchQuery} onChange={(e) => setHeaderSearchQuery(e.target.value)} className="bg-slate-800/50 border border-slate-700 text-fuchsia-300 rounded-full w-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-fuchsia-500 focus:outline-none placeholder:text-fuchsia-400/50"/>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                             <svg className="w-4 h-4 text-fuchsia-400/80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/></svg>
                        </div>
                     </form>
                </div>
                
                 <div className="flex items-center gap-4">
                    <div className="relative" ref={notificationPanelRef}>
                        <button onClick={handleToggleNotifications} className="p-2 rounded-full text-fuchsia-400 hover:bg-slate-800 relative">
                            <Icon name="bell" className="w-6 h-6"/>
                            {unreadNotificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white border-2 border-slate-900">
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </span>
                            )}
                        </button>
                        {isNotificationPanelOpen && <NotificationPanel notifications={notifications} onClose={() => setNotificationPanelOpen(false)} onNotificationClick={handleNotificationClick} />}
                    </div>
                    <div className="relative" ref={profileMenuRef}>
                        <button onClick={() => setProfileMenuOpen(p => !p)}>
                            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                        </button>
                         {isProfileMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-white overflow-hidden animate-fade-in-fast">
                                <ul>
                                    <li><button onClick={() => { setProfileMenuOpen(false); navigate(AppView.PROFILE, { username: user.username }); }} className="w-full text-left p-3 flex items-center gap-3 hover:bg-slate-700/50">View profile</button></li>
                                    {user.role === 'admin' && <li><a href="#/adminpannel" className="w-full text-left p-3 flex items-center gap-3 hover:bg-slate-700/50">Admin Panel</a></li>}
                                    <li><button onClick={() => { setProfileMenuOpen(false); navigate(AppView.SETTINGS); }} className="w-full text-left p-3 flex items-center gap-3 hover:bg-slate-700/50">Settings</button></li>
                                    <li><button onClick={handleLogout} className="w-full text-left p-3 flex items-center gap-3 text-red-400 hover:bg-red-500/10">Logout</button></li>
                                </ul>
                            </div>
                         )}
                    </div>
                </div>
            </header>
        )}
        
        {/* Mobile Header */}
        {!isFullScreenView && (
            <header className="flex-shrink-0 h-14 bg-black/20 backdrop-blur-md border-b border-fuchsia-500/20 z-30 flex md:hidden items-center justify-between px-2">
                {viewStack.length > 1 && !isMobileSearchOpen && (
                     <button onClick={goBack} className="p-2 rounded-full text-fuchsia-400 hover:bg-slate-800">
                        <Icon name="back" className="w-6 h-6" />
                    </button>
                )}
                {!isMobileSearchOpen && <a href="#/"><Icon name="logo" className="w-8 h-8 text-fuchsia-400 ml-2" /></a>}
                {isMobileSearchOpen && (
                    <form onSubmit={handleHeaderSearchSubmit} className="relative flex-grow mx-2">
                        <input autoFocus type="search" placeholder="Search..." value={headerSearchQuery} onChange={(e) => setHeaderSearchQuery(e.target.value)} className="bg-slate-800 border border-slate-700 text-fuchsia-300 rounded-full w-full py-2 pl-4 pr-10 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"/>
                         <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3">
                             <svg className="w-4 h-4 text-fuchsia-400/80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/></svg>
                        </button>
                     </form>
                )}
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMobileSearchOpen(p => !p)} className="p-2 rounded-full text-fuchsia-400 hover:bg-slate-800">
                        {isMobileSearchOpen ? <Icon name="close" className="w-6 h-6" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                    </button>
                    <div className="relative" ref={notificationPanelRef}>
                        <button onClick={handleToggleNotifications} className="p-2 rounded-full text-fuchsia-400 hover:bg-slate-800 relative">
                            <Icon name="bell" className="w-6 h-6"/>
                            {unreadNotificationCount > 0 && (
                                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </span>
                            )}
                        </button>
                         {isNotificationPanelOpen && <NotificationPanel notifications={notifications} onClose={() => setNotificationPanelOpen(false)} onNotificationClick={handleNotificationClick} />}
                    </div>
                </div>
            </header>
        )}

        <div className="flex-grow overflow-hidden relative">
          <div ref={mainContentRef} className={`h-full w-full absolute inset-0 overflow-y-auto ${isFullScreenView ? '' : 'pb-32 md:pb-8'}`}>
            {renderView()}
          </div>
        </div>

      </main>
      
      {!isFullScreenView && <ContactsPanel friends={friends} onOpenConversation={handleOpenConversation} />}
      
      {user && activeChats.length > 0 && (
          <ChatManager
            currentUser={user}
            activeChats={activeChats}
            friends={friends}
            minimizedChats={minimizedChats}
            chatUnreadCounts={chatUnreadCounts}
            onCloseChat={handleCloseChat}
            onMinimizeToggle={handleMinimizeToggle}
            setIsChatRecording={setIsChatRecording}
            onNavigate={navigate}
            onSetTtsMessage={setTtsMessage}
            onBlockUser={handleBlockUser}
          />
      )}
      
      {isShowingAd && campaignForAd && (
        <AdModal campaign={campaignForAd} onComplete={handleAdComplete} onSkip={handleAdSkip} />
      )}
      {viewingAd && (
        <CampaignViewerModal post={viewingAd} onClose={() => setViewingAd(null)} />
      )}
       {shareModalPost && (
         <ShareModal post={shareModalPost} onClose={() => setShareModalPost(null)} onSetTtsMessage={setTtsMessage} />
      )}
       {leadFormPost && (
         <LeadFormModal post={leadFormPost} currentUser={user} onClose={() => setLeadFormPost(null)} onSubmit={handleLeadSubmit} />
      )}
       {viewerPost && (
         <ImageModal post={viewerPost} currentUser={user} isLoading={isLoadingViewerPost} onClose={handleClosePhotoViewer} onReactToPost={handleReactToPost} onReactToComment={handleReactToComment} onPostComment={handlePostComment} onEditComment={handleEditComment} onDeleteComment={handleDeleteComment} onOpenProfile={handleOpenProfile} onSharePost={handleSharePost}/>
      )}
       {incomingCall && (
          <IncomingCallModal 
              call={incomingCall}
              onAccept={handleAcceptCall}
              onReject={handleRejectCall}
          />
      )}
      {!isFullScreenView && (
        <MobileBottomNav 
            onNavigate={handleNavigation}
            friendRequestCount={friendRequestCount}
            activeView={currentView.view}
            voiceState={voiceState}
            onMicClick={handleMicClick}
            onSendCommand={handleCommand}
            commandInputValue={commandInputValue}
            setCommandInputValue={setCommandInputValue}
            ttsMessage={ttsMessage}
            isChatRecording={isChatRecording}
        />
      )}
    </div>
  );
};

export default UserApp;