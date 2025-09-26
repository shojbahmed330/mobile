
import React from 'react';
import { AppView, User } from '../types';
import Icon from './Icon';

interface RoomsHubScreenProps {
    onNavigate: (view: AppView, props?: any) => void;
}

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}> = ({ icon, title, description, onClick }) => (
    <button
        onClick={onClick}
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-left hover:border-lime-500/50 hover:bg-slate-800 transition-all duration-300 transform hover:-translate-y-1"
    >
        <div className="text-lime-400 mb-4">{icon}</div>
        <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
        <p className="text-slate-400 mt-2">{description}</p>
    </button>
);


const RoomsHubScreen: React.FC<RoomsHubScreenProps> = ({ onNavigate }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-900/60 to-slate-900">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-slate-100">Live Hub</h1>
                <p className="text-slate-400 mt-2 text-lg">Connect with others in real-time.</p>
            </div>
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                <FeatureCard
                    icon={<Icon name="chat-bubble-group" className="w-12 h-12" />}
                    title="Audio Rooms"
                    description="Join or host live audio-only conversations. Perfect for podcasts, discussions, and hanging out."
                    onClick={() => onNavigate(AppView.ROOMS_LIST)}
                />
                <FeatureCard
                    icon={<Icon name="video-camera" className="w-12 h-12" />}
                    title="Video Rooms"
                    description="Start or join group video calls. See and talk to friends, colleagues, and new people face-to-face."
                    onClick={() => onNavigate(AppView.VIDEO_ROOMS_LIST)}
                />
            </div>
        </div>
    );
};

export default RoomsHubScreen;
