
import React, { useState } from 'react';
import { User, AppView } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface CreateEventScreenProps {
  currentUser: User;
  groupId: string;
  onGoBack: () => void;
  onSetTtsMessage: (message: string) => void;
}

const CreateEventScreen: React.FC<CreateEventScreenProps> = ({ currentUser, groupId, onGoBack, onSetTtsMessage }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { language } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !date) {
      alert("Please fill out all fields.");
      return;
    }
    setIsCreating(true);
    await geminiService.createGroupEvent(currentUser, groupId, title, description, new Date(date).toISOString());
    onSetTtsMessage(getTtsPrompt('event_created', language));
    onGoBack();
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-8 bg-slate-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-6">Create New Event</h1>
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg space-y-6">
          <div>
            <label htmlFor="title" className="block mb-2 text-sm font-medium text-slate-300">Event Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500"
            />
          </div>
          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-slate-300">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500 resize-none"
            />
          </div>
          <div>
            <label htmlFor="date" className="block mb-2 text-sm font-medium text-slate-300">Date & Time</label>
            <input
              type="datetime-local"
              id="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-3 focus:ring-lime-500 focus:border-lime-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onGoBack} className="px-5 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold">Cancel</button>
            <button type="submit" disabled={isCreating} className="px-5 py-2 rounded-lg bg-lime-600 hover:bg-lime-500 text-black font-bold disabled:bg-slate-500">
              {isCreating ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventScreen;
