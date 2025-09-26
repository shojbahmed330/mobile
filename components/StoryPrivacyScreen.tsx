import React, { useState, useEffect } from 'react';
import { StoryPrivacy } from '../types';
import Icon from './Icon';

interface StoryPrivacyScreenProps {
  currentPrivacy: StoryPrivacy;
  onSave: (privacy: StoryPrivacy) => void;
  onGoBack: () => void;
}

const PrivacyOption: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    value: StoryPrivacy;
    selectedValue: StoryPrivacy;
    onSelect: (value: StoryPrivacy) => void;
}> = ({ icon, title, description, value, selectedValue, onSelect }) => (
    <button onClick={() => onSelect(value)} className="w-full flex items-center gap-4 text-left p-3 rounded-lg hover:bg-slate-700/50">
        <div className="flex-shrink-0 w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">{icon}</div>
        <div className="flex-grow">
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedValue === value ? 'border-sky-500' : 'border-slate-500'}`}>
            {selectedValue === value && <div className="w-3 h-3 bg-sky-500 rounded-full"></div>}
        </div>
    </button>
);

const SettingRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string;
    isPlaceholder?: boolean;
}> = ({ icon, title, value, isPlaceholder }) => (
     <button className="w-full flex items-center gap-4 text-left p-3 rounded-lg hover:bg-slate-700/50" disabled={isPlaceholder}>
        <div className="flex-shrink-0 w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">{icon}</div>
        <div className="flex-grow">
            <h3 className={`font-semibold ${isPlaceholder ? 'text-slate-500' : 'text-slate-100'}`}>{title}</h3>
            <p className={`text-sm ${isPlaceholder ? 'text-slate-600' : 'text-slate-400'}`}>{value}</p>
        </div>
        {!isPlaceholder && <Icon name="back" className="w-5 h-5 text-slate-400 transform -rotate-180" />}
    </button>
)

const StoryPrivacyScreen: React.FC<StoryPrivacyScreenProps> = ({ currentPrivacy, onSave, onGoBack }) => {
  const [selected, setSelected] = useState<StoryPrivacy>(currentPrivacy);

  // This effect ensures that when the user navigates back, the selected value is saved.
  // The onGoBack prop is called from the header in UserApp.tsx, which unmounts this component.
  useEffect(() => {
    return () => {
      onSave(selected);
    };
  }, [selected, onSave]);

  return (
    <div className="h-full w-full overflow-y-auto p-4 bg-slate-900 text-white">
        <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">Who can see your story?</h1>
            <p className="text-slate-400 mb-6">Your story will be visible for 24 hours on VoiceBook.</p>
            
            <div className="space-y-2">
                <PrivacyOption
                    icon={<Icon name="globe" className="w-6 h-6 text-slate-300"/>}
                    title="Public"
                    description="Anyone on or off VoiceBook"
                    value="public"
                    selectedValue={selected}
                    onSelect={setSelected}
                />
                <PrivacyOption
                    icon={<Icon name="users" className="w-6 h-6 text-slate-300"/>}
                    title="Friends"
                    description="Only your VoiceBook friends"
                    value="friends"
                    selectedValue={selected}
                    onSelect={setSelected}
                />
            </div>

            <div className="border-t border-slate-700 my-6"></div>

             <div className="space-y-2">
                 <SettingRow 
                    icon={<Icon name="user-slash" className="w-6 h-6 text-slate-500"/>}
                    title="Hide story from"
                    value="Feature not available"
                    isPlaceholder
                />
                 <SettingRow 
                    icon={<Icon name="users" className="w-6 h-6 text-slate-500"/>}
                    title="Custom"
                    value="Feature not available"
                    isPlaceholder
                />
             </div>
             
             <div className="border-t border-slate-700 my-6"></div>
             
             <h2 className="text-xl font-bold mb-2">Other settings</h2>
             
             <div className="space-y-2">
                <SettingRow 
                    icon={<Icon name="user-slash" className="w-6 h-6 text-slate-500"/>}
                    title="Stories you've muted"
                    value="Feature not available"
                    isPlaceholder
                />
                 <SettingRow 
                    icon={<Icon name="settings" className="w-6 h-6 text-slate-500"/>}
                    title="Camera roll settings"
                    value="Feature not available"
                    isPlaceholder
                />
             </div>


        </div>
    </div>
  );
};

export default StoryPrivacyScreen;
