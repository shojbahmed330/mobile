import React from 'react';
import Icon from './Icon';
import { VoiceState } from '../types';

interface VoiceCommandInputProps {
  onSendCommand: (command: string) => void;
  voiceState: VoiceState;
  onMicClick: () => void;
  value: string;
  onValueChange: (newValue: string) => void;
  placeholder?: string;
  isChatRecording?: boolean;
}

const VoiceCommandInput: React.FC<VoiceCommandInputProps> = ({ onSendCommand, voiceState, onMicClick, value, onValueChange, placeholder, isChatRecording }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSendCommand(value.trim());
    }
  };

  const isListening = voiceState === VoiceState.LISTENING;
  const hasText = value.trim().length > 0;

  const getIndicatorColor = () => {
    if (isChatRecording) return 'text-slate-500';
    switch (voiceState) {
      case VoiceState.LISTENING:
        return 'text-rose-500 animate-pulse';
      case VoiceState.PROCESSING:
        return 'text-yellow-500';
      default:
        return 'text-fuchsia-400';
    }
  };

  const placeholderText = isChatRecording
    ? "Recording voice message..."
    : isListening
    ? "Listening..."
    : placeholder || "Say or type a command...";

  return (
    <form onSubmit={handleSubmit} className="w-full bg-black/30 p-2">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Icon name="mic" className={`w-5 h-5 ${getIndicatorColor()}`} />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholderText}
          className="bg-slate-900/70 border border-fuchsia-500/30 text-slate-100 text-base rounded-full focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 block w-full pl-11 pr-16 py-3 transition"
          disabled={isListening || isChatRecording}
        />
        
        {/* --- Mobile Button: single, circular, changes icon --- */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 md:hidden">
            <button 
                type="submit" 
                onClick={(e) => {
                    if (!hasText) {
                        e.preventDefault();
                        onMicClick();
                    }
                }}
                className="w-12 h-12 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white flex items-center justify-center transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
                disabled={isListening || isChatRecording}
                aria-label={hasText ? "Send command" : "Use voice command"}
            >
                <div className="relative w-6 h-6">
                    {/* Send Icon */}
                    <div className={`absolute inset-0 transition-all duration-300 ${hasText ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-50'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                            <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826L11.25 8.25l-5.607 1.77a.75.75 0 00-.826.95l1.414 4.949a.75.75 0 00.95.826l3.296-1.048a.75.75 0 00.421-.23l7.48-7.48a.75.75 0 00-1.06-1.06l-7.48 7.48a.75.75 0 00-.23.421l-1.048 3.296z" />
                        </svg>
                    </div>
                    {/* Mic Icon */}
                    <div className={`absolute inset-0 transition-all duration-300 ${!hasText ? 'opacity-100 transform scale-100' : 'opacity-0 transform scale-50'}`}>
                         <Icon name="mic" className="w-6 h-6" />
                    </div>
                </div>
            </button>
        </div>

        {/* --- Desktop Buttons: original layout --- */}
        <div className="absolute inset-y-0 right-0 hidden md:flex items-center">
            <button type="button" onClick={onMicClick} title="Use voice command" className="p-2 rounded-full text-slate-400 hover:text-fuchsia-500 transition-colors mr-14 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isChatRecording}>
                <Icon name="mic" className={`w-7 h-7 ${isListening ? 'text-rose-500' : 'text-slate-400'}`} />
            </button>
            <button type="submit" className="h-full px-4 text-slate-400 hover:text-fuchsia-500 transition-colors font-semibold" disabled={isChatRecording}>
                Send
            </button>
        </div>
      </div>
    </form>
  );
};

export default VoiceCommandInput;