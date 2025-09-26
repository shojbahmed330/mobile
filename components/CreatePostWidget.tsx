import React from 'react';
import type { User } from '../types';
import Icon from './Icon';

interface CreatePostWidgetProps {
  user: User;
  onStartCreatePost: (props?: any) => void;
}

const CreatePostWidget: React.FC<CreatePostWidgetProps> = ({ user, onStartCreatePost }) => {
  return (
    <div className="bg-slate-900/50 border border-lime-500/20 rounded-lg p-4 w-full max-w-lg md:max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full" />
        <button
          onClick={() => onStartCreatePost()}
          className="flex-grow text-left bg-slate-800 hover:bg-slate-700 rounded-full px-5 py-3 text-lime-400/80 transition-colors"
        >
          What's on your mind, {user.name.split(' ')[0]}?
        </button>
      </div>
      <div className="border-t border-lime-500/20 mt-4 pt-3 flex justify-around">
        <button onClick={() => onStartCreatePost({ startRecording: true })} className="flex items-center gap-2 text-lime-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors">
          <Icon name="mic" className="w-6 h-6 text-lime-400" />
          <span className="font-semibold">Voice</span>
        </button>
         <button onClick={() => onStartCreatePost({ selectMedia: 'image' })} className="flex items-center gap-2 text-lime-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors">
            <Icon name="photo" className="w-6 h-6 text-lime-400"/> 
            <span className="font-semibold">Photo</span>
        </button>
         <button onClick={() => onStartCreatePost({ selectMedia: 'video' })} className="flex items-center gap-2 text-lime-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors">
            <Icon name="video-camera" className="w-6 h-6 text-lime-400"/> 
            <span className="font-semibold">Video</span>
        </button>
      </div>
    </div>
  );
};

export default CreatePostWidget;