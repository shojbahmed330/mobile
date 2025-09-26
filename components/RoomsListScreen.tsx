
import React, { useState, useEffect } from 'react';
import { AppView, LiveAudioRoom, User } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface RoomsListScreenProps {
  currentUser: User;
  onNavigate: (view: AppView, props?: any) => void;
}

const CreateRoomModal: React.FC<{
    onClose: () => void;
    onCreate: (topic: string) => Promise<void>;
}> = ({ onClose, onCreate }) => {
    const [topic, setTopic] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!topic.trim()) return;
        setIsCreating(true);
        await onCreate(topic);
        // The parent will handle closing the modal after navigation
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Create a Room</h2>
                <p className="text-slate-400 mb-6">Start a live audio conversation about any topic.</p>
                <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="What's the topic of your room?"
                    className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500"
                    autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">Cancel</button>
                    <button onClick={handleCreate} disabled={!topic.trim() || isCreating} className="px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-black font-bold disabled:bg-slate-500">
                        {isCreating ? 'Starting...' : 'Start Room'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const RoomsListScreen: React.FC<RoomsListScreenProps> = ({ currentUser, onNavigate }) => {
  const [rooms, setRooms] = useState<LiveAudioRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = geminiService.listenToLiveAudioRooms((liveRooms) => {
      setRooms(liveRooms);
      setIsLoading(false);
    });

    return () => unsubscribe(); // Unsubscribe on cleanup
  }, []);
  
  const handleJoinRoom = (roomId: string) => {
    onNavigate(AppView.LIVE_ROOM, { roomId });
  };

  const handleCreateRoom = async (topic: string) => {
    const newRoom = await geminiService.createLiveAudioRoom(currentUser, topic);
    if (newRoom) {
      setCreateModalOpen(false);
      onNavigate(AppView.LIVE_ROOM, { roomId: newRoom.id });
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-8 bg-gradient-to-b from-black to-slate-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100 mb-4 sm:mb-0">Live Audio Rooms</h1>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="w-full sm:w-auto bg-lime-600 hover:bg-lime-500 text-black font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="mic" className="w-6 h-6"/>
            <span>Create a Room</span>
          </button>
        </div>

        {isLoading ? (
          <p className="text-center text-slate-400">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-lg">
            <Icon name="chat-bubble-group" className="w-20 h-20 mx-auto text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-300">It's quiet in here...</h2>
            <p className="text-slate-400 mt-2">No live rooms are active right now. Why not start your own?</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <div key={room.id} className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 flex flex-col justify-between hover:border-lime-500/50 transition-colors">
                <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-3 h-14">{room.topic}</h3>
                    <div className="flex items-center gap-2 mb-4">
                        <img src={room.host.avatarUrl} alt={room.host.name} className="w-8 h-8 rounded-full" />
                        <span className="text-sm text-slate-300">Hosted by <span className="font-semibold">{room.host.name}</span></span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center -space-x-2">
                        {room.speakers.slice(0, 3).map(s => <img key={s.id} src={s.avatarUrl} title={s.name} className="w-7 h-7 rounded-full border-2 border-slate-800"/>)}
                        {room.listeners.length > 0 && <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 border-2 border-slate-800">+{room.listeners.length}</div>}
                        <span className="pl-4 text-slate-400 text-sm">{room.speakers.length + room.listeners.length} listening</span>
                    </div>
                    <button onClick={() => handleJoinRoom(room.id)} className="bg-lime-600 hover:bg-lime-500 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                        Join Room
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {isCreateModalOpen && <CreateRoomModal onClose={() => setCreateModalOpen(false)} onCreate={handleCreateRoom} />}
    </div>
  );
};

export default RoomsListScreen;
