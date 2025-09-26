

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { User, ScrollState } from '../types';
import { geminiService } from '../services/geminiService';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { t } from '../i18n';

interface SettingsScreenProps {
  currentUser: User;
  onUpdateSettings: (settings: Partial<User>) => Promise<void>;
  onUnblockUser: (user: User) => void;
  onDeactivateAccount: () => void;
  lastCommand: string | null;
  onSetTtsMessage: (message: string) => void;
  scrollState: ScrollState;
  onCommandProcessed: () => void;
  onGoBack: () => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean, onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
    <button
        type="button"
        className={`${enabled ? 'bg-rose-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
    >
        <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
    </button>
);

const SettingRow: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-3">
      <div className="flex items-center gap-4 w-full sm:w-1/3 flex-shrink-0">
          <div className="text-slate-400">{icon}</div>
          <span className="font-semibold text-slate-200">{title}</span>
      </div>
      <div className="w-full sm:w-2/3">{children}</div>
    </div>
);

const SettingRowInput: React.FC<{ icon: React.ReactNode; title: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; isTextarea?: boolean; placeholder?: string; }> = ({ icon, title, value, onChange, isTextarea, placeholder }) => (
    <SettingRow icon={icon} title={title}>
        {isTextarea ? (
             <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition resize-none" />
        ) : (
             <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition" />
        )}
    </SettingRow>
);

const SettingRowSelect: React.FC<{ icon: React.ReactNode; title: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; }> = ({ icon, title, value, onChange, children }) => (
    <SettingRow icon={icon} title={title}>
        <select value={value} onChange={onChange} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 transition">
            {children}
        </select>
    </SettingRow>
);


const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentUser, onUpdateSettings, onUnblockUser, onDeactivateAccount, lastCommand, onSetTtsMessage, scrollState, onCommandProcessed, onGoBack }) => {
  const { language, setLanguage } = useSettings();
  
  // Profile info state
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [work, setWork] = useState(currentUser.work || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [currentCity, setCurrentCity] = useState(currentUser.currentCity || '');
  const [hometown, setHometown] = useState(currentUser.hometown || '');
  const [relationshipStatus, setRelationshipStatus] = useState(currentUser.relationshipStatus || 'Prefer not to say');

  // Privacy settings state
  const [postVisibility, setPostVisibility] = useState(currentUser.privacySettings.postVisibility);
  const [friendRequestPrivacy, setFriendRequestPrivacy] = useState(currentUser.privacySettings.friendRequestPrivacy);
  const [friendListVisibility, setFriendListVisibility] = useState(currentUser.privacySettings.friendListVisibility || 'friends');
  const [notificationSettings, setNotificationSettings] = useState(
    currentUser.notificationSettings || { likes: true, comments: true, friendRequests: true, campaignUpdates: true, groupPosts: true }
  );
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Account Management state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isDeactivationModalOpen, setIsDeactivationModalOpen] = useState(false);


  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    onSetTtsMessage(getTtsPrompt('settings_opened', language));
    
    // Fetch full user objects for blocked IDs
    const fetchBlockedUsers = async () => {
        const users = await Promise.all(
            currentUser.blockedUserIds.map(id => geminiService.getUserById(id))
        );
        setBlockedUsers(users.filter((u): u is User => u !== null));
    };
    fetchBlockedUsers();
  }, [currentUser.blockedUserIds, onSetTtsMessage, language]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
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

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    const updatedSettings: Partial<User> = {
      name,
      bio,
      work,
      education,
      currentCity,
      hometown,
      relationshipStatus,
      privacySettings: {
        postVisibility,
        friendRequestPrivacy,
        friendListVisibility,
      },
      notificationSettings,
    };
    await onUpdateSettings(updatedSettings);
    setIsLoading(false);
    onSetTtsMessage(getTtsPrompt('settings_saved', language));
  }, [name, bio, work, education, currentCity, hometown, relationshipStatus, postVisibility, friendRequestPrivacy, friendListVisibility, notificationSettings, onUpdateSettings, onSetTtsMessage, language]);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword !== confirmNewPassword) {
        setPasswordError("New passwords do not match.");
        return;
    }
    if (newPassword.length < 6) {
        setPasswordError("Password must be at least 6 characters long.");
        return;
    }
    setIsLoading(true);
    const success = await geminiService.changePassword(currentUser.id, currentPassword, newPassword);
    setIsLoading(false);
    if (success) {
        onSetTtsMessage(getTtsPrompt('password_changed_success', language));
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
    } else {
        onSetTtsMessage(getTtsPrompt('password_change_fail', language));
        setPasswordError("Your current password was incorrect.");
    }
  };

  const handleDeactivate = () => {
      setIsDeactivationModalOpen(true);
  };

  const confirmDeactivation = () => {
      setIsDeactivationModalOpen(false);
      onDeactivateAccount();
  };

  const cancelDeactivation = () => {
      setIsDeactivationModalOpen(false);
  };


  const handleCommand = useCallback(async (command: string) => {
    try {
        const intentResponse = await geminiService.processIntent(command);

        switch(intentResponse.intent) {
            case 'intent_go_back':
                onGoBack();
                break;
            case 'intent_save_settings':
                handleSave();
                break;
            case 'intent_update_profile':
                if (intentResponse.slots?.field && intentResponse.slots?.value) {
                    const { field, value } = intentResponse.slots;
                    if (typeof value !== 'string') return;
                    
                    const fieldSetterMap: Record<string, (val: string) => void> = {
                        name: setName,
                        bio: setBio,
                        work: setWork,
                        education: setEducation,
                        hometown: setHometown,
                        currentCity: setCurrentCity,
                        relationshipStatus: setRelationshipStatus as (val:string) => void,
                    };

                    const setter = fieldSetterMap[field as string];
                    if(setter) {
                        setter(value);
                        onSetTtsMessage(getTtsPrompt('setting_updated_generic', language, { field: field as string, value }));
                    }
                }
                break;
            case 'intent_update_privacy':
                 if (intentResponse.slots?.setting && intentResponse.slots?.value) {
                    const { setting, value } = intentResponse.slots;
                    if (setting === 'postVisibility' && (value === 'public' || value === 'friends')) {
                        setPostVisibility(value as 'public' | 'friends');
                        onSetTtsMessage(getTtsPrompt('privacy_setting_updated', language, { setting: 'Post visibility', value: value as string }));
                    } else if (setting === 'friendRequestPrivacy' && (value === 'everyone' || value === 'friends_of_friends')) {
                        setFriendRequestPrivacy(value as 'everyone' | 'friends_of_friends');
                        onSetTtsMessage(getTtsPrompt('privacy_setting_updated', language, { setting: 'Friend request privacy', value: value as string }));
                    }
                }
                break;
            case 'intent_update_notification_setting':
                if (intentResponse.slots?.setting && intentResponse.slots?.value) {
                    const { setting, value } = intentResponse.slots;
                    const isEnabled = value === 'on';
                    const settingKey = setting as keyof typeof notificationSettings;
                    if (settingKey in notificationSettings) {
                        setNotificationSettings(s => ({ ...s, [settingKey]: isEnabled }));
                        onSetTtsMessage(getTtsPrompt('notification_setting_updated', language, {setting: setting as string, value: value as string}));
                    }
                }
                break;
            case 'intent_unblock_user':
                if (intentResponse.slots?.target_name) {
                    const targetName = intentResponse.slots.target_name as string;
                    const userToUnblock = blockedUsers.find(u => u.name.toLowerCase() === targetName.toLowerCase());
                    if (userToUnblock) {
                        onUnblockUser(userToUnblock);
                    }
                }
                break;
            case 'intent_change_password':
                setIsChangingPassword(true);
                onSetTtsMessage(getTtsPrompt('password_change_prompt', language));
                break;
            case 'intent_deactivate_account':
                handleDeactivate();
                break;
        }
    } catch (error) {
        console.error("Error processing command in SettingsScreen:", error);
    } finally {
        onCommandProcessed();
    }
  }, [handleSave, onSetTtsMessage, blockedUsers, onUnblockUser, onCommandProcessed, onGoBack, notificationSettings, language]);

  useEffect(() => {
    if(lastCommand) {
        handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  return (
    <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 sm:p-8 text-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t(language, 'settings.title')}</h1>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 text-white font-bold py-2 px-5 rounded-lg transition-colors text-lg"
          >
            {isLoading ? t(language, 'settings.saving') : t(language, 'settings.saveAll')}
          </button>
        </div>
        
        {/* Language Settings */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-2 text-rose-400">Language</h2>
          <div className="flex gap-2 p-1 bg-slate-700 rounded-lg">
              <button onClick={() => setLanguage('en')} className={`w-full p-2 rounded-md font-semibold transition-colors ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-300'}`}>English</button>
              <button onClick={() => setLanguage('bn')} className={`w-full p-2 rounded-md font-semibold transition-colors ${language === 'bn' ? 'bg-slate-900 text-white' : 'text-slate-300'}`}>বাংলা</button>
          </div>
        </div>


        {/* Profile Information */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-2 text-rose-400">{t(language, 'settings.profileInfo')}</h2>
          <SettingRowInput icon={<Icon name="edit" className="w-5 h-5"/>} title={t(language, 'settings.fullName')} value={name} onChange={e => setName(e.target.value)} />
          <SettingRowInput icon={<Icon name="edit" className="w-5 h-5"/>} title={t(language, 'settings.bio')} value={bio} onChange={e => setBio(e.target.value)} isTextarea />
          <SettingRowInput icon={<Icon name="briefcase" className="w-5 h-5"/>} title={t(language, 'settings.work')} value={work} onChange={e => setWork(e.target.value)} placeholder="Where do you work?"/>
          <SettingRowInput icon={<Icon name="academic-cap" className="w-5 h-5"/>} title={t(language, 'settings.education')} value={education} onChange={e => setEducation(e.target.value)} placeholder="Where did you study?"/>
          <SettingRowInput icon={<Icon name="map-pin" className="w-5 h-5"/>} title={t(language, 'settings.currentCity')} value={currentCity} onChange={e => setCurrentCity(e.target.value)} placeholder="Where do you live?"/>
          <SettingRowInput icon={<Icon name="home" className="w-5 h-5"/>} title={t(language, 'settings.hometown')} value={hometown} onChange={e => setHometown(e.target.value)} placeholder="Where are you from?"/>
          <SettingRowSelect icon={<Icon name="like" className="w-5 h-5"/>} title={t(language, 'settings.relationship')} value={relationshipStatus} onChange={e => setRelationshipStatus(e.target.value as any)}>
              <option value="Prefer not to say">{t(language, 'settings.relationshipStatus.prefer_not_to_say')}</option>
              <option value="Single">{t(language, 'settings.relationshipStatus.single')}</option>
              <option value="In a relationship">{t(language, 'settings.relationshipStatus.in_a_relationship')}</option>
              <option value="Engaged">{t(language, 'settings.relationshipStatus.engaged')}</option>
              <option value="Married">{t(language, 'settings.relationshipStatus.married')}</option>
              <option value="It's complicated">{t(language, 'settings.relationshipStatus.its_complicated')}</option>
          </SettingRowSelect>
        </div>

        {/* Privacy */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-2 text-rose-400">{t(language, 'settings.privacy')}</h2>
          <SettingRowSelect icon={<Icon name="globe" className="w-5 h-5"/>} title={t(language, 'settings.postVisibility')} value={postVisibility} onChange={e => setPostVisibility(e.target.value as 'public' | 'friends')}>
              <option value="public">{t(language, 'settings.postVisibilityOptions.public')}</option>
              <option value="friends">{t(language, 'settings.postVisibilityOptions.friends')}</option>
          </SettingRowSelect>
          <SettingRowSelect icon={<Icon name="users" className="w-5 h-5"/>} title={t(language, 'settings.friendRequestPrivacy')} value={friendRequestPrivacy} onChange={e => setFriendRequestPrivacy(e.target.value as 'everyone' | 'friends_of_friends')}>
              <option value="everyone">{t(language, 'settings.friendRequestPrivacyOptions.everyone')}</option>
              <option value="friends_of_friends">{t(language, 'settings.friendRequestPrivacyOptions.friends_of_friends')}</option>
          </SettingRowSelect>
           <SettingRowSelect icon={<Icon name="users" className="w-5 h-5"/>} title={t(language, 'settings.friendListVisibility')} value={friendListVisibility} onChange={e => setFriendListVisibility(e.target.value as any)}>
              <option value="public">{t(language, 'settings.friendListVisibilityOptions.public')}</option>
              <option value="friends">{t(language, 'settings.friendListVisibilityOptions.friends')}</option>
              <option value="only_me">{t(language, 'settings.friendListVisibilityOptions.only_me')}</option>
          </SettingRowSelect>
        </div>

        {/* Notifications */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-semibold mb-2 text-rose-400">{t(language, 'settings.notifications')}</h2>
            <SettingRow icon={<Icon name="like" className="w-5 h-5"/>} title={t(language, 'settings.likesOnPosts')}>
                <ToggleSwitch enabled={notificationSettings.likes ?? true} onChange={enabled => setNotificationSettings(s => ({...s, likes: enabled}))} />
            </SettingRow>
            <SettingRow icon={<Icon name="comment" className="w-5 h-5"/>} title={t(language, 'settings.commentsOnPosts')}>
                 <ToggleSwitch enabled={notificationSettings.comments ?? true} onChange={enabled => setNotificationSettings(s => ({...s, comments: enabled}))} />
            </SettingRow>
             <SettingRow icon={<Icon name="add-friend" className="w-5 h-5"/>} title={t(language, 'settings.newFriendRequests')}>
                 <ToggleSwitch enabled={notificationSettings.friendRequests ?? true} onChange={enabled => setNotificationSettings(s => ({...s, friendRequests: enabled}))} />
            </SettingRow>
             <SettingRow icon={<Icon name="briefcase" className="w-5 h-5"/>} title={t(language, 'settings.campaignUpdates')}>
                 <ToggleSwitch enabled={notificationSettings.campaignUpdates ?? true} onChange={enabled => setNotificationSettings(s => ({...s, campaignUpdates: enabled}))} />
            </SettingRow>
             <SettingRow icon={<Icon name="users" className="w-5 h-5"/>} title={t(language, 'settings.newGroupPosts')}>
                 <ToggleSwitch enabled={notificationSettings.groupPosts ?? true} onChange={enabled => setNotificationSettings(s => ({...s, groupPosts: enabled}))} />
            </SettingRow>
        </div>
        
        {/* Blocking */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-rose-400">{t(language, 'settings.blocking')}</h2>
           <p className="text-sm text-slate-400 mb-4">{t(language, 'settings.blockingDescription')}</p>
          <div className="space-y-3">
            {blockedUsers.length > 0 ? blockedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full"/>
                  <span className="font-semibold text-slate-200">{user.name}</span>
                </div>
                <button onClick={() => onUnblockUser(user)} className="px-3 py-1.5 text-sm font-semibold rounded-md bg-slate-600 hover:bg-slate-500 text-white transition-colors">{t(language, 'settings.unblock')}</button>
              </div>
            )) : <p className="text-slate-400">{t(language, 'settings.noBlockedUsers')}</p>}
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-rose-400">{t(language, 'settings.accountManagement')}</h2>
          <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setIsChangingPassword(true)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">{t(language, 'settings.changePassword')}</button>
              <button onClick={handleDeactivate} className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">{t(language, 'settings.deactivateAccount')}</button>
          </div>
        </div>
      </div>

      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsChangingPassword(false)}>
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 relative space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold">{t(language, 'settings.changePassword')}</h3>
                {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                <input type="password" placeholder="Confirm New Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="bg-slate-700 border border-slate-600 text-slate-100 text-base rounded-lg block w-full p-2.5" />
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsChangingPassword(false)} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">{t(language, 'common.cancel')}</button>
                    <button onClick={handleChangePassword} disabled={isLoading} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:bg-slate-600">{isLoading ? t(language, 'settings.saving') : t(language, 'common.save')}</button>
                </div>
            </div>
        </div>
      )}

      {isDeactivationModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={cancelDeactivation}>
              <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-bold mb-2">{t(language, 'settings.deactivateConfirmTitle')}</h3>
                  <p className="text-slate-300 mb-6">{t(language, 'settings.deactivateConfirmBody')}</p>
                  <div className="flex justify-center gap-4">
                      <button onClick={cancelDeactivation} className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">{t(language, 'common.cancel')}</button>
                      <button onClick={confirmDeactivation} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold">{t(language, 'settings.confirmDeactivation')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsScreen;