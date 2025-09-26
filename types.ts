// types.ts

export type Language = 'en' | 'bn';

// --- Enums and Simple Types ---

export enum AppView {
  AUTH, FEED, EXPLORE, REELS, CREATE_POST, CREATE_REEL, CREATE_COMMENT, PROFILE, SETTINGS, POST_DETAILS, FRIENDS, SEARCH_RESULTS, CONVERSATIONS, ADS_CENTER, ROOMS_HUB, ROOMS_LIST, LIVE_ROOM, VIDEO_ROOMS_LIST, LIVE_VIDEO_ROOM, GROUPS_HUB, GROUP_PAGE, MANAGE_GROUP, GROUP_CHAT, GROUP_EVENTS, CREATE_EVENT, CREATE_STORY, STORY_VIEWER, STORY_PRIVACY, GROUP_INVITE, CALL_SCREEN, MOBILE_MENU
}

export enum VoiceState {
  IDLE, LISTENING, PROCESSING
}

export enum ScrollState {
  UP = 'up',
  DOWN = 'down',
  NONE = 'none'
}

export enum AuthMode {
  LOGIN, SIGNUP_FULLNAME, SIGNUP_USERNAME, SIGNUP_EMAIL, SIGNUP_PASSWORD, SIGNUP_CONFIRM_PASSWORD
}

export enum RecordingState {
  IDLE, RECORDING, PREVIEW, UPLOADING, POSTED
}

export enum FriendshipStatus {
  NOT_FRIENDS,
  REQUEST_SENT,
  PENDING_APPROVAL,
  FRIENDS
}

export type ChatTheme = 'default' | 'sunset' | 'classic' | 'aurora' | 'golden-hour' | 'cyberpunk' | 'emerald-sea' | 'starlight';
export type GroupCategory = 'General' | 'Food' | 'Gaming' | 'Music' | 'Technology' | 'Travel' | 'Art & Culture' | 'Sports';
export type GroupRole = 'Admin' | 'Moderator' | 'Top Contributor';
export type StoryPrivacy = 'public' | 'friends';

// --- Core Data Structures ---

export interface PrivacySettings {
  postVisibility: 'public' | 'friends';
  friendRequestPrivacy: 'everyone' | 'friends_of_friends';
  friendListVisibility: 'public' | 'friends' | 'only_me';
}

export interface NotificationSettings {
    likes?: boolean;
    comments?: boolean;
    friendRequests?: boolean;
    campaignUpdates?: boolean;
    groupPosts?: boolean;
}

export interface User {
  id: string;
  name: string;
  name_lowercase: string;
  username: string;
  email: string;
  password?: string; // Should not be sent to client, but might exist in type def
  avatarUrl: string;
  bio: string;
  coverPhotoUrl: string;
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettings;
  blockedUserIds: string[];
  friendIds: string[];
  voiceCoins: number;
  createdAt: string | any; // Can be server timestamp
  onlineStatus: 'online' | 'offline';
  lastActiveTimestamp?: string;
  role?: 'user' | 'admin';
  isDeactivated?: boolean;
  isBanned?: boolean;
  commentingSuspendedUntil?: string;
  postingSuspendedUntil?: string;
  work?: string;
  education?: string;
  currentCity?: string;
  hometown?: string;
  relationshipStatus?: 'Single' | 'In a relationship' | 'Engaged' | 'Married' | "It's complicated" | 'Prefer not to say';
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  friendshipStatus?: FriendshipStatus;
}

export interface Author {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    privacySettings?: PrivacySettings;
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  type: 'text' | 'image' | 'audio';
  createdAt: string;
  updatedAt?: string;
  reactions: { [userId: string]: string };
  parentId: string | null;
  isDeleted?: boolean;
}

export interface PollOption {
  text: string;
  votes: number;
  votedBy: string[];
}

export interface Post {
  id: string;
  author: Author;
  caption: string;
  createdAt: string;
  imageUrl?: string;
  newPhotoUrl?: string; // For profile/cover photo changes
  imagePrompt?: string;
  videoUrl?: string;
  audioUrl?: string;
  duration: number;
  reactions: { [userId: string]: string };
  commentCount: number;
  comments: Comment[];
  isSponsored?: boolean;
  sponsorName?: string;
  campaignId?: string;
  sponsorId?: string;
  websiteUrl?: string;
  allowDirectMessage?: boolean;
  allowLeadForm?: boolean;
  groupId?: string;
  groupName?: string;
  status?: 'approved' | 'pending' | 'rejected';
  postType?: 'announcement' | 'question' | 'profile_picture_change' | 'cover_photo_change';
  captionStyle?: {
      fontFamily?: string;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
  };
  poll?: {
    question: string;
    options: PollOption[];
  };
  bestAnswerId?: string;
  feeling?: { emoji: string; text: string; };
}

export interface ReplyInfo {
  messageId: string;
  senderName: string;
  content: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text?: string;
  mediaUrl?: string;
  audioUrl?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'call_history';
  createdAt: string;
  read: boolean;
  isDeleted?: boolean;
  duration?: number;
  reactions?: { [emoji: string]: string[] };
  replyTo?: ReplyInfo;
  // For call history
  callType?: 'audio' | 'video';
  callStatus?: Call['status'];
  callDuration?: number; // in seconds
}

export interface Conversation {
  peer: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  language: 'bangla' | 'hindi';
}

export interface StoryTextStyle {
    name: string;
    backgroundColor: string;
    fontFamily: string;
    color: string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
}

export interface Story {
  id: string;
  author: User;
  type: 'image' | 'video' | 'text' | 'voice';
  contentUrl?: string; // for image/video/voice
  text?: string;       // for text stories
  textStyle?: StoryTextStyle;
  duration: number; // in seconds
  createdAt: string;
  viewedBy: string[];
  music?: MusicTrack;
  privacy: StoryPrivacy;
  isSponsored?: boolean;
  sponsorName?: string;
  sponsorAvatar?: string;
  campaignId?: string;
  ctaLink?: string;
}

export interface Campaign {
  id: string;
  sponsorId: string;
  sponsorName: string;
  caption: string;
  budget: number;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  websiteUrl?: string;
  allowDirectMessage: boolean;
  allowLeadForm: boolean;
  views: number;
  clicks: number;
  status: 'pending' | 'active' | 'finished' | 'rejected';
  createdAt: string;
  transactionId?: string;
  paymentStatus?: 'pending' | 'verified' | 'failed';
  paymentVerifiedBy?: string;
  adType: 'feed' | 'story';
  targeting?: {
    location?: string;
    gender?: 'Male' | 'Female' | 'All';
    ageRange?: string;
    interests?: string[];
  };
}

export interface Lead {
  id: string;
  campaignId: string;
  sponsorId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'like' | 'comment' | 'mention' | 'friend_request' | 'friend_request_approved' | 'campaign_approved' | 'campaign_rejected' | 'admin_announcement' | 'admin_warning' | 'group_post' | 'group_join_request' | 'group_request_approved';
  user: Author; // The user who initiated the action
  post?: { id: string; caption?: string };
  comment?: { id: string; text?: string }; // For comment replies/mentions
  groupId?: string;
  groupName?: string;
  campaignName?: string;
  rejectionReason?: string;
  message?: string;
  read: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface LiveAudioRoom {
  id: string;
  host: Author;
  topic: string;
  speakers: Author[];
  listeners: Author[];
  raisedHands: string[];
  createdAt: string;
  status: 'live' | 'ended';
}

export interface VideoParticipantState {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
    isMuted: boolean;
    isCameraOff: boolean;
}

export interface LiveVideoRoom {
  id: string;
  host: Author;
  topic: string;
  participants: VideoParticipantState[];
  createdAt: string;
  status: 'live' | 'ended';
}

export interface JoinRequest {
    user: User;
    answers?: string[];
}

export interface Group {
    id: string;
    name: string;
    description: string;
    creator: Author;
    coverPhotoUrl: string;
    members: Author[];
    memberCount: number;
    admins: Author[];
    moderators: Author[];
    privacy: 'public' | 'private';
    createdAt: string;
    category: GroupCategory;
    requiresApproval: boolean;
    joinQuestions?: string[];
    joinRequests?: JoinRequest[];
    pendingPosts?: Post[];
    invitedUserIds?: string[];
    pinnedPostId?: string;
    topContributorIds?: string[];
}

export interface GroupChat {
    groupId: string;
    messages: {
        id: string;
        sender: Author;
        text: string;
        createdAt: string;
    }[];
}

export interface Event {
    id: string;
    groupId: string;
    creator: Author;
    title: string;
    description: string;
    date: string;
    attendees: Author[];
}

export interface ChatSettings {
  theme: ChatTheme;
  nickname?: { [userId: string]: string };
}

export interface Call {
  id: string;
  caller: Author;
  callee: Author;
  chatId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'rejected' | 'missed' | 'declined';
  createdAt: string;
  endedAt?: any;
}

export interface NLUResponse {
  intent: string;
  slots?: { [key: string]: string | number };
}

export interface CategorizedExploreFeed {
    trending: Post[];
    forYou: Post[];
    questions: Post[];
    funnyVoiceNotes: Post[];
    newTalent: Post[];
}

export interface Report {
    id: string;
    reporterId: string;
    reporterName: string;
    reportedUserId: string;
    reportedContentId: string;
    reportedContentType: 'post' | 'comment' | 'user';
    reason: string;
    status: 'pending' | 'resolved';
    createdAt: string;
    resolution?: string;
}

export interface LiveAudioRoomMessage {
  id: string;
  sender: Author;
  text: string;
  isHost: boolean;
  isSpeaker: boolean;
  createdAt: string;
  reactions: { [emoji: string]: string[] };
}

export interface LiveVideoRoomMessage {
  id: string;
  sender: Author;
  text: string;
  createdAt: string;
}