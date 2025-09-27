
import React from 'react';
import { Notification } from '../types';
import Icon from './Icon';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const TimeAgo: React.FC<{ date: string }> = ({ date: dateString }) => {
    try {
        const date = new Date(dateString);
        // Check for invalid date, which could cause NaN and unexpected behavior
        if (isNaN(date.getTime())) {
            return <>a while ago</>;
        }

        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 5) return <>Just now</>;
        
        let interval = seconds / 31536000; // year
        if (interval > 1) return <>{Math.floor(interval)}y</>;
        
        interval = seconds / 2592000; // month
        if (interval > 1) return <>{Math.floor(interval)}mo</>;
        
        interval = seconds / 86400; // day
        if (interval > 1) return <>{Math.floor(interval)}d</>;
        
        interval = seconds / 3600; // hour
        if (interval > 1) return <>{Math.floor(interval)}h</>;
        
        interval = seconds / 60; // minute
        if (interval > 1) return <>{Math.floor(interval)}m</>;
        
        return <>{Math.floor(seconds)}s</>;

    } catch (e) {
        console.error("Error parsing date for TimeAgo:", dateString, e);
        return <>a while ago</>;
    }
};

const NotificationItem: React.FC<{ notification: Notification; onClick: () => void }> = ({ notification, onClick }) => {
  if (!notification || !notification.user) {
    return null; 
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'like': return <Icon name="like" className="w-5 h-5 text-white fill-current" />;
      case 'comment': return <Icon name="comment" className="w-5 h-5 text-white" />;
      case 'mention': return <Icon name="logo" className="w-5 h-5 text-white" />;
      case 'friend_request': return <Icon name="add-friend" className="w-5 h-5 text-white" />;
      case 'campaign_approved': return <Icon name="briefcase" className="w-5 h-5 text-white" />;
      case 'campaign_rejected': return <Icon name="briefcase" className="w-5 h-5 text-white" />;
      case 'group_post': return <Icon name="users" className="w-5 h-5 text-white" />;
      case 'group_join_request': return <Icon name="add-friend" className="w-5 h-5 text-white" />;
      case 'group_request_approved': return <Icon name="users" className="w-5 h-5 text-white" />;
      case 'admin_announcement': return <Icon name="speaker-wave" className="w-5 h-5 text-white" />;
      case 'admin_warning': return <Icon name="bell" className="w-5 h-5 text-white" />;
      default: return null;
    }
  };

  const getIconBgColor = () => {
    switch (notification.type) {
        case 'like': return 'bg-rose-500';
        case 'comment': return 'bg-sky-500';
        case 'mention': return 'bg-sky-500';
        case 'friend_request': return 'bg-green-500';
        case 'campaign_approved': return 'bg-green-500';
        case 'campaign_rejected': return 'bg-red-500';
        case 'group_post': return 'bg-sky-500';
        case 'group_join_request': return 'bg-indigo-500';
        case 'group_request_approved': return 'bg-green-500';
        case 'admin_announcement': return 'bg-sky-500';
        case 'admin_warning': return 'bg-yellow-500';
        default: return 'bg-slate-500';
    }
  }

  const getText = () => {
    const postPreviewText = notification.post?.caption
        ? `"${notification.post.caption.substring(0, 30)}${notification.post.caption.length > 30 ? '...' : ''}"`
        : 'your post';
    
    const postPreview = <span className="italic text-slate-400">{postPreviewText}</span>;

    switch (notification.type) {
      case 'like':
        if (notification.comment?.id) {
            return <><span className="font-bold">{notification.user.name}</span> reacted to your comment on {postPreview}.</>;
        }
        return <><span className="font-bold">{notification.user.name}</span> liked {postPreview}.</>;
      case 'comment':
        return <><span className="font-bold">{notification.user.name}</span> commented on {postPreview}.</>;
      case 'mention':
        return <><span className="font-bold">{notification.user.name}</span> mentioned you in a {notification.comment ? 'comment' : 'post'}.</>;
      case 'friend_request':
        return <><span className="font-bold">{notification.user.name}</span> sent you a friend request.</>;
      case 'campaign_approved':
        return <>Your campaign '<span className="font-bold">{notification.campaignName}</span>' has been approved and is now live!</>;
      case 'campaign_rejected':
        return <>Your campaign '<span className="font-bold">{notification.campaignName}</span>' was rejected. {notification.rejectionReason || ''}</>;
      case 'group_post':
        return <><span className="font-bold">{notification.user.name}</span> posted in <span className="font-bold">{notification.groupName}</span>.</>;
      case 'group_join_request':
        return <><span className="font-bold">{notification.user.name}</span> requested to join <span className="font-bold">{notification.groupName}</span>.</>;
      case 'group_request_approved':
        return <>Your request to join <span className="font-bold">{notification.groupName}</span> has been approved.</>;
      case 'admin_announcement':
        return <><span className="font-bold text-sky-400">Announcement:</span> {notification.message}</>;
      case 'admin_warning':
        return <><span className="font-bold text-yellow-400">Warning:</span> {notification.message}</>;
      default:
        return 'New notification';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-slate-700/50 ${!notification.read ? 'bg-slate-700' : ''}`}
    >
        <div className="relative flex-shrink-0">
            <img src={notification.user.avatarUrl} alt={notification.user.name} className="w-12 h-12 rounded-full" />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${getIconBgColor()}`}>
                {getIcon()}
            </div>
        </div>
        <div className="flex-grow">
            <p className="text-slate-200 text-sm leading-tight">{getText()}</p>
            <p className={`text-sm mt-1 ${notification.read ? 'text-slate-400' : 'text-rose-400 font-semibold'}`}>
                <TimeAgo date={notification.createdAt} />
            </p>
        </div>
        {!notification.read && <div className="w-2 h-2 rounded-full bg-rose-500 self-center flex-shrink-0"></div>}
    </button>
  );
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onNotificationClick }) => {
  // Sort notifications to ensure the newest is always on top.
  const sortedNotifications = [...notifications].sort((a, b) => {
    // Add guards for potentially nullish items or createdAt properties
    if (!a?.createdAt || !b?.createdAt) return 0;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in-fast">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-100">Notifications</h3>
        {/* Future: Add a "Mark all as read" button */}
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/50">
        {sortedNotifications.length > 0 ? (
          sortedNotifications.filter(Boolean).map(n => <NotificationItem key={n.id} notification={n} onClick={() => onNotificationClick(n)} />)
        ) : (
          <p className="p-8 text-center text-slate-400">You have no notifications yet.</p>
        )}
      </div>
       <div className="p-2 bg-slate-900/50 text-center">
            {/* Could have a "View all notifications" link here */}
      </div>
    </div>
  );
};

export default NotificationPanel;
