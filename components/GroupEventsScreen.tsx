
import React, { useState, useEffect } from 'react';
import { Event, Group, User, AppView } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface GroupEventsScreenProps {
  currentUser: User;
  groupId: string;
  onGoBack: () => void;
  onNavigate: (view: AppView, props?: any) => void;
}

const EventCard: React.FC<{ event: Event; currentUser: User; onRsvp: (eventId: string) => void }> = ({ event, currentUser, onRsvp }) => {
  const isAttending = event.attendees.some(a => a.id === currentUser.id);
  const eventDate = new Date(event.date);

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
      <div className="p-5">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-bold text-lime-400">{eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <h3 className="text-2xl font-bold text-slate-100 mt-1">{event.title}</h3>
                <p className="text-slate-400 mt-2">{event.description}</p>
            </div>
            <div className="text-center bg-slate-700/50 p-2 rounded-md">
                <p className="text-3xl font-bold text-white">{eventDate.getDate()}</p>
                <p className="text-xs uppercase text-slate-300">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</p>
            </div>
        </div>
      </div>
      <div className="bg-slate-800/50 p-3 flex justify-between items-center">
        <div className="flex items-center -space-x-2">
            {event.attendees.slice(0, 5).map(a => <img key={a.id} src={a.avatarUrl} title={a.name} className="w-8 h-8 rounded-full border-2 border-slate-800"/>)}
            {event.attendees.length > 5 && <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 border-2 border-slate-800">+{event.attendees.length - 5}</div>}
            <span className="pl-4 text-slate-400 text-sm">{event.attendees.length} attending</span>
        </div>
        <button
          onClick={() => onRsvp(event.id)}
          disabled={isAttending}
          className="bg-lime-600 hover:bg-lime-500 disabled:bg-slate-600 text-black font-bold py-2 px-5 rounded-lg transition-colors"
        >
          {isAttending ? 'Attending' : 'RSVP'}
        </button>
      </div>
    </div>
  );
};

const GroupEventsScreen: React.FC<GroupEventsScreenProps> = ({ currentUser, groupId, onGoBack, onNavigate }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [eventsData, groupData] = await Promise.all([
        geminiService.getGroupEvents(groupId),
        geminiService.getGroupById(groupId)
      ]);
      setEvents(eventsData);
      setGroup(groupData);
      setIsLoading(false);
    };
    fetchData();
  }, [groupId]);
  
  const handleRsvp = async (eventId: string) => {
    const success = await geminiService.rsvpToEvent(currentUser.id, eventId);
    if(success) {
      // Optimistic update
      setEvents(prevEvents => prevEvents.map(e => 
        e.id === eventId ? { ...e, attendees: [...e.attendees, currentUser] } : e
      ));
    }
  };

  if (isLoading || !group) {
    return <div className="flex items-center justify-center h-full bg-slate-900"><p className="text-slate-300">Loading events...</p></div>;
  }

  const isAdmin = group.admins.some(a => a.id === currentUser.id);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center">
            <button onClick={onGoBack} className="p-2 rounded-full hover:bg-slate-700 transition-colors mr-2">
                <Icon name="back" className="w-6 h-6 text-slate-300"/>
            </button>
            <div>
              <h2 className="font-bold text-lg text-slate-100">{group.name} Events</h2>
            </div>
        </div>
        {isAdmin && (
            <button onClick={() => onNavigate(AppView.CREATE_EVENT, { groupId })} className="bg-lime-600 hover:bg-lime-500 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                <Icon name="edit" className="w-5 h-5"/> Create Event
            </button>
        )}
      </header>

      <main className="flex-grow overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
            {events.length > 0 ? (
                <div className="space-y-6">
                    {events.map(event => <EventCard key={event.id} event={event} currentUser={currentUser} onRsvp={handleRsvp} />)}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-800/50 rounded-lg">
                    <Icon name="bell" className="w-20 h-20 mx-auto text-slate-600 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-300">No Upcoming Events</h2>
                    <p className="text-slate-400 mt-2">{isAdmin ? "Create an event to bring the group together." : "Check back later for new events."}</p>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default GroupEventsScreen;
