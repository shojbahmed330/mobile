


import React, { useEffect, useCallback } from 'react';
import { User } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface SearchResultsScreenProps {
  results: User[];
  query: string;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onOpenProfile: (username: string) => void;
  onCommandProcessed: () => void;
  onGoBack: () => void;
}

const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({ results, query, onSetTtsMessage, lastCommand, onOpenProfile, onCommandProcessed, onGoBack }) => {
  const { language } = useSettings();

  const handleCommand = useCallback(async (command: string) => {
    try {
        const intentResponse = await geminiService.processIntent(command);
        if (intentResponse.intent === 'intent_select_result' && intentResponse.slots?.index) {
          const index = Number(intentResponse.slots.index) - 1; // 1-based to 0-based
          if (results[index]) {
            onOpenProfile(results[index].username);
          } else {
            onSetTtsMessage(`Sorry, I couldn't find result number ${intentResponse.slots.index}.`);
          }
        } else if (intentResponse.intent === 'intent_go_back') {
            onGoBack();
        }
    } catch (error) {
        console.error("Error processing command in SearchResultsScreen:", error);
    } finally {
        onCommandProcessed();
    }
  }, [results, onOpenProfile, onSetTtsMessage, onCommandProcessed, onGoBack]);
  
  useEffect(() => {
    if (lastCommand) {
      handleCommand(lastCommand);
    }
  }, [lastCommand, handleCommand]);

  useEffect(() => {
     if (results.length > 0) {
        onSetTtsMessage(getTtsPrompt('search_results_loaded', language, { count: results.length }));
     } else {
        onSetTtsMessage(getTtsPrompt('search_no_results', language, { query }));
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, results.length, language]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
        <Icon name="logo" className="w-16 h-16 mb-4 opacity-50"/>
        <p className="text-xl">No results found for</p>
        <p className="text-2xl font-bold text-slate-200">"{query}"</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-slate-100">Search results for: <span className="text-rose-400">"{query}"</span></h1>
        <div className="flex flex-col gap-4">
          {results.map((user, index) => (
            <button
              key={user.id}
              onClick={() => onOpenProfile(user.username)}
              className="bg-slate-800 rounded-lg p-4 flex items-center gap-4 text-left w-full hover:bg-slate-700/50 transition-colors group"
            >
              <span className="text-2xl font-bold text-slate-500 group-hover:text-rose-400 transition-colors">{index + 1}.</span>
              <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full" />
              <div className="flex-grow">
                <p className="font-bold text-lg text-slate-100">{user.name}</p>
                <p className="text-sm text-slate-400">{user.bio}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsScreen;
