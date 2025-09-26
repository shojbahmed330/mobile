import React from 'react';
import { User, Story } from '../types';

interface StoriesTrayProps {
  currentUser: User;
  storiesByAuthor: {
    author: User;
    stories: Story[];
    allViewed: boolean;
  }[];
  onViewStories: (initialUserIndex: number) => void;
  onCreateStory: () => void;
}

const CreateStoryCard: React.FC<{ user: User; onClick: () => void }> = ({ user, onClick }) => {
  return (
    <div className="w-28 flex-shrink-0">
      <button onClick={onClick} className="w-full h-48 rounded-lg overflow-hidden relative group bg-slate-800 shadow-lg">
        <div className="w-full h-3/5 overflow-hidden">
          <img src={user.avatarUrl} alt="Your profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-slate-700 flex flex-col items-center justify-end pb-2">
            <p className="text-white text-xs font-semibold">Create story</p>
        </div>
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-slate-700">
            <span className="text-white font-bold text-2xl pb-1">+</span>
        </div>
      </button>
    </div>
  );
};

const StoryCard: React.FC<{
  storyGroup: { author: User; stories: Story[]; allViewed: boolean };
  onClick: () => void;
}> = ({ storyGroup, onClick }) => {
  if (!storyGroup || !storyGroup.author || !storyGroup.stories || storyGroup.stories.length === 0) {
    return null;
  }

  const { author, stories, allViewed } = storyGroup;
  const firstStory = stories[0];
  
  // Use story content for preview, fallback to author's avatar for text/voice stories
  const previewUrl = firstStory.type === 'image' || firstStory.type === 'video' ? firstStory.contentUrl : author.avatarUrl;

  return (
    <div className="w-28 flex-shrink-0">
        <button onClick={onClick} className="w-full h-48 rounded-lg overflow-hidden relative group shadow-lg">
            {firstStory.type === 'video' && previewUrl ? (
                <video src={previewUrl} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
                <img src={previewUrl} alt={`${author.name}'s story`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
            <img 
                src={author.avatarUrl} 
                alt={author.name} 
                className={`absolute top-2 left-2 w-10 h-10 rounded-full object-cover border-4 transition-all ${!allViewed ? 'border-blue-500' : 'border-transparent'}`} 
            />
            <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-semibold truncate">{author.name}</p>
        </button>
    </div>
  );
};

const StoriesTray: React.FC<StoriesTrayProps> = ({ currentUser, storiesByAuthor, onViewStories, onCreateStory }) => {
  return (
    <div className="bg-slate-800 rounded-2xl p-3 w-full">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 -mb-2 no-scrollbar">
        <CreateStoryCard user={currentUser} onClick={onCreateStory} />
        {storiesByAuthor.filter(Boolean).map((group, index) => (
          <StoryCard
            key={group.author.id}
            storyGroup={group}
            onClick={() => onViewStories(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default StoriesTray;
