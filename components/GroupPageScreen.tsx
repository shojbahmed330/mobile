import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Group, Post, User, AppView, GroupRole } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { PostCard } from './PostCard';
import CreatePostWidget from './CreatePostWidget';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface JoinQuestionsModalProps {
    groupName: string;
    questions: string[];
    onClose: () => void;
    onSubmit: (answers: string[]) => Promise<void>;
}

const JoinQuestionsModal: React.FC<JoinQuestionsModalProps> = ({ groupName, questions, onClose, onSubmit }) => {
    const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onSubmit(answers);
        // The parent component will handle closing the modal.
    };

    const canSubmit = answers.every(a => a.trim() !== '');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Join {groupName}</h2>
                <p className="text-slate-400 mb-6">Please answer the following questions to join this private group.</p>
                <div className="space-y-4">
                    {questions.map((q, index) => (
                        <div key={index}>
                            <label className="block mb-1 text-sm font-medium text-slate-300">{q}</label>
                            <textarea
                                value={answers[index]}
                                onChange={e => handleAnswerChange(index, e.target.value)}
                                rows={2}
                                className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2 focus:ring-lime-500 focus:border-lime-500 resize-none"
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">Cancel</button>
                    <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-black font-bold disabled:bg-slate-500">
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};


interface GroupPageScreenProps {
  currentUser: User;
  groupId: string;
  onNavigate: (view: AppView, props?: any) => void;
  onSetTtsMessage: (message: string) => void;
  onOpenProfile: (userName: string) => void;
  onViewPost: (postId: string) => void;
  onReactToPost: (postId: string, emoji: string) => void;
  onSharePost: (post: Post) => void;
  onStartCreatePost: (props: any) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  onGoBack: () => void;
  onStartComment: (postId: string) => void;
}

const GroupPageScreen: React.FC<GroupPageScreenProps> = ({
  currentUser,
  groupId,
  onNavigate,
  onSetTtsMessage,
  onOpenProfile,
  onViewPost,
  onReactToPost,
  onSharePost,
  onStartCreatePost,
  lastCommand,
  onCommandProcessed,
  onGoBack,
  onStartComment
}) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Post[]>([]);
  const [pinnedPost, setPinnedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'events'>('feed');
  const [isQuestionModalOpen, setQuestionModalOpen] = useState(false);
  const { language } = useSettings();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    const groupDetails = await geminiService.getGroupById(groupId);
    if (groupDetails) {
      setGroup(groupDetails);
      const memberStatus = groupDetails.members.some(m => m.id === currentUser.id);
      setIsMember(memberStatus);
      setHasRequested(groupDetails.joinRequests?.some(r => r.user.id === currentUser.id) ?? false);
      
      const canViewPosts = groupDetails.privacy === 'public' || memberStatus;
      if (canViewPosts) {
          const groupPosts = await geminiService.getPostsForGroup(groupId);
          
          const announcementPosts = groupPosts.filter(p => p.postType === 'announcement');
          const regularPosts = groupPosts.filter(p => p.postType !== 'announcement');
          
          const pinned = groupDetails.pinnedPostId ? regularPosts.find(p => p.id === groupDetails.pinnedPostId) : null;

          setAnnouncements(announcementPosts);
          setPinnedPost(pinned);
          setPosts(regularPosts.filter(p => p.id !== groupDetails.pinnedPostId));
      } else {
          setPosts([]);
          setPinnedPost(null);
          setAnnouncements([]);
      }
      
      if(isInitial) onSetTtsMessage(getTtsPrompt('group_page_loaded', language, { name: groupDetails.name }));
    }
    setIsLoading(false);
  }, [groupId, currentUser.id, onSetTtsMessage, language]);

  useEffect(() => {
    setIsLoading(true);
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 7000); // Poll for new posts/members
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleJoin = async (answers?: string[]) => {
    if (!group) return;
    setQuestionModalOpen(false); // Close modal if open
    const success = await geminiService.joinGroup(currentUser.id, group.id, answers);
    if (success) {
        if (group.privacy === 'public') {
            onSetTtsMessage(getTtsPrompt('group_joined', language, { name: group.name }));
        } else {
            onSetTtsMessage(getTtsPrompt('join_request_sent', language));
        }
        fetchData(true);
    }
  };

  const handleJoinClick = () => {
    if (!group) return;
    if (group.privacy === 'private' && group.joinQuestions && group.joinQuestions.length > 0) {
        setQuestionModalOpen(true);
    } else {
        handleJoin();
    }
  };


  const handleLeave = async () => {
    if (!group) return;
    const success = await geminiService.leaveGroup(currentUser.id, group.id);
    if (success) {
      onSetTtsMessage(getTtsPrompt('group_left', language, { name: group.name }));
      fetchData(true);
    }
  };
  
  const handleManage = () => {
    onNavigate(AppView.MANAGE_GROUP, { groupId });
  }

  const handlePinPost = async (postId: string) => {
    const success = await geminiService.pinPost(groupId, postId);
    if (success) {
        onSetTtsMessage(getTtsPrompt('post_pinned', language));
        fetchData(false);
    }
  };

  const handleUnpinPost = async (postId: string) => {
    const success = await geminiService.unpinPost(groupId);
    if (success) {
        onSetTtsMessage(getTtsPrompt('post_unpinned', language));
        fetchData(false);
    }
  };
  
  const handleVote = async (postId: string, optionIndex: number) => {
    const updatedPost = await geminiService.voteOnPoll(currentUser.id, postId, optionIndex);
    if(updatedPost) {
        setPosts(currentPosts => currentPosts.map(p => p.id === postId ? updatedPost : p));
        if (pinnedPost && pinnedPost.id === postId) {
            setPinnedPost(updatedPost);
        }
        onSetTtsMessage(getTtsPrompt('poll_voted', language));
    }
  }

  const isCreator = group?.creator.id === currentUser.id;
  const isAdmin = group?.admins.some(a => a.id === currentUser.id);
  const canManage = isCreator || isAdmin;

  const handleCommand = useCallback(async (command: string) => {
    if (!group) return;

    try {
        const intentResponse = await geminiService.processIntent(command);
        const { intent } = intentResponse;

        switch(intent) {
            case 'intent_manage_group':
                if (canManage) {
                    handleManage();
                } else {
                    onSetTtsMessage("You don't have permission to manage this group.");
                }
                break;
            case 'intent_open_group_invite_page':
                if (isMember) {
                    onNavigate(AppView.GROUP_INVITE, { groupId: group.id });
                } else {
                    onSetTtsMessage("You must be a member to invite others.");
                }
                break;
            case 'intent_open_group_chat':
                onNavigate(AppView.GROUP_CHAT, { groupId });
                break;
            case 'intent_open_group_events':
                onNavigate(AppView.GROUP_EVENTS, { groupId });
                break;
            case 'intent_go_back':
                onGoBack();
                break;
        }
    } catch (e) { 
        console.error("Error processing command in GroupPageScreen:", e);
        onSetTtsMessage(getTtsPrompt('error_generic', language));
    } finally {
        onCommandProcessed();
    }
}, [group, canManage, isMember, onNavigate, onSetTtsMessage, onCommandProcessed, onGoBack, language]);

useEffect(() => {
    if (lastCommand) {
        handleCommand(lastCommand);
    }
}, [lastCommand, handleCommand]);


  if (isLoading || !group) {
    return <div className="flex items-center justify-center h-full"><p className="text-slate-300 text-xl">Loading group...</p></div>;
  }
  
  const isModerator = group.moderators.some(m => m.id === currentUser.id);

  const getRole = (user: { id: string }): GroupRole | undefined => {
    if (!group) return undefined;
    if (group.admins.some(a => a.id === user.id)) return 'Admin';
    if (group.moderators.some(m => m.id === user.id)) return 'Moderator';
    if (group.topContributorIds?.includes(user.id)) return 'Top Contributor';
    return undefined;
  };

  const TabButton: React.FC<{tab: 'feed' | 'chat' | 'events'; label: string; icon: React.ComponentProps<typeof Icon>['name']}> = ({ tab, label, icon }) => (
    <button
      onClick={() => {
          if (tab === 'chat') onNavigate(AppView.GROUP_CHAT, { groupId });
          else if (tab === 'events') onNavigate(AppView.GROUP_EVENTS, { groupId });
      }}
      className={`px-4 py-3 font-semibold text-lg border-b-4 flex items-center gap-2 transition-colors ${
        activeTab === tab
          ? 'border-lime-500 text-slate-100'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon name={icon} className="w-5 h-5" /> {label}
    </button>
  );

  return (
    <>
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto bg-slate-900">
      <header className="relative">
        <div className="w-full h-48 sm:h-60 bg-slate-700">
          <img src={group.coverPhotoUrl} alt={`${group.name} cover`} className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="flex-grow text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3 justify-center sm:justify-start">
                  {group.privacy === 'private' && <Icon name="lock-closed" className="w-6 h-6 text-slate-300"/>}
                  {group.name}
              </h1>
              <p className="text-slate-300 mt-1">{group.memberCount.toLocaleString()} members · {group.privacy === 'public' ? 'Public' : 'Private'} Group</p>
            </div>
            <div className="flex-shrink-0 flex flex-wrap justify-center gap-2 sm:flex-nowrap">
              {isMember && (
                  <button onClick={() => onNavigate(AppView.GROUP_INVITE, { groupId: group.id })} className="bg-lime-600 hover:bg-lime-500 text-black font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                      <Icon name="add-friend" className="w-5 h-5"/>
                      Invite
                  </button>
              )}
              {canManage && (
                <button onClick={handleManage} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Manage
                </button>
              )}
              {isMember ? (
                <button onClick={handleLeave} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                  Leave Group
                </button>
              ) : hasRequested ? (
                 <button disabled className="bg-slate-500 text-slate-300 font-bold py-2 px-6 rounded-lg cursor-not-allowed">
                  Request Sent
                </button>
              ) : (
                <button onClick={handleJoinClick} className="bg-lime-600 hover:bg-lime-500 text-black font-bold py-2 px-6 rounded-lg transition-colors">
                  {group.privacy === 'public' ? 'Join Group' : 'Request to Join'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-4xl mx-auto flex items-center">
             <TabButton tab="feed" label="Feed" icon="home" />
             <TabButton tab="chat" label="Chat" icon="message" />
             <TabButton tab="events" label="Events" icon="bell" />
          </div>
      </div>

      <main className="max-w-lg mx-auto p-4 sm:p-8 flex flex-col gap-8">
        {isMember && (
          <CreatePostWidget
            user={currentUser}
            onStartCreatePost={(props = {}) => onStartCreatePost({ ...props, groupId: group.id, groupName: group.name })}
          />
        )}
        
        {isMember || group.privacy === 'public' ? (
            <>
              {announcements.length > 0 && (
                <div className="space-y-8 border-b-2 border-yellow-500/30 pb-8">
                    {announcements.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={currentUser}
                            isActive={false}
                            isPlaying={false}
                            onPlayPause={() => onViewPost(post.id)}
                            onReact={onReactToPost}
                            onViewPost={onViewPost}
                            onAuthorClick={onOpenProfile}
                            isGroupAdmin={canManage}
                            onVote={handleVote}
                            groupRole={getRole(post.author)}
                            onStartComment={onStartComment}
                            onSharePost={onSharePost}
                        />
                    ))}
                </div>
              )}
              {pinnedPost && (
                <div className="border-b-2 border-lime-500/30 pb-8">
                  <p className="text-lime-400 font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    Pinned Post
                  </p>
                  <PostCard post={pinnedPost} currentUser={currentUser} isActive={false} isPlaying={false} onPlayPause={() => onViewPost(pinnedPost.id)} onReact={onReactToPost} onViewPost={onViewPost} onAuthorClick={onOpenProfile} isGroupAdmin={canManage} isPinned={true} onUnpinPost={handleUnpinPost} onVote={handleVote} groupRole={getRole(pinnedPost.author)} onStartComment={onStartComment} onSharePost={onSharePost}/>
                </div>
              )}
              {posts.length > 0 ? (
                  posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={currentUser}
                        isActive={false} 
                        isPlaying={false}
                        onPlayPause={() => onViewPost(post.id)}
                        onReact={onReactToPost}
                        onViewPost={onViewPost}
                        onAuthorClick={onOpenProfile}
                        isGroupAdmin={canManage}
                        isPinned={false}
                        onPinPost={handlePinPost}
                        onVote={handleVote}
                        groupRole={getRole(post.author)}
                        onStartComment={onStartComment}
                        onSharePost={onSharePost}
                      />
                  ))
              ) : (
                  <div className="text-center py-12">
                      <Icon name="logo" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                      <h3 className="text-xl font-bold text-slate-300">No posts yet</h3>
                      <p className="text-slate-400 mt-2">
                        {isMember ? "Be the first to post in this group!" : "Join the group to see and create posts."}
                      </p>
                  </div>
              )}
            </>
        ) : (
            <div className="text-center py-12 bg-slate-800 rounded-lg flex flex-col items-center gap-4">
                <Icon name="lock-closed" className="w-16 h-16 mx-auto text-slate-500" />
                <h3 className="text-xl font-bold text-slate-200">This Group is Private</h3>
                <p className="text-slate-400">Request to join this group to see or create posts.</p>
            </div>
        )}
      </main>
    </div>
     {isQuestionModalOpen && group && group.joinQuestions && (
        <JoinQuestionsModal
          groupName={group.name}
          questions={group.joinQuestions}
          onClose={() => setQuestionModalOpen(false)}
          onSubmit={handleJoin}
        />
      )}
    </>
  );
};

export default GroupPageScreen;