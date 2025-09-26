
import React, { useState, useEffect, useCallback } from 'react';
import { AuthMode } from '../types';
import { firebaseService } from '../services/firebaseService';
import Icon from './Icon';
import { getTtsPrompt } from '../constants';
import { useSettings } from '../contexts/SettingsContext';

interface AuthScreenProps {
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  initialAuthError?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onSetTtsMessage, lastCommand, onCommandProcessed, initialAuthError
}) => {
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { language } = useSettings();

  useEffect(() => {
    if (initialAuthError) {
        setAuthError(initialAuthError);
        onSetTtsMessage(initialAuthError);
    }
  }, [initialAuthError, onSetTtsMessage]);

  useEffect(() => {
    if (!initialAuthError) {
        onSetTtsMessage(getTtsPrompt('login_prompt', language));
    }
    setMode(AuthMode.LOGIN); 
  }, [onSetTtsMessage, initialAuthError, language]);

  const resetSignupState = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setAuthError('');
  };

  const handleTextInput = useCallback(async (text: string) => {
      setIsLoading(true);
      setAuthError('');
      const cleanedText = text.trim();

      try {
        switch(mode) {
            case AuthMode.LOGIN:
                if (!identifier) {
                    setIdentifier(cleanedText);
                    onSetTtsMessage(getTtsPrompt('login_password', language));
                } else {
                    await firebaseService.signInWithEmail(identifier, cleanedText);
                }
                break;
            case AuthMode.SIGNUP_FULLNAME:
                setFullName(cleanedText);
                setMode(AuthMode.SIGNUP_USERNAME);
                onSetTtsMessage(getTtsPrompt('signup_username', language));
                break;
            case AuthMode.SIGNUP_USERNAME:
                const formattedUsername = cleanedText.toLowerCase().replace(/\s/g, '');
                const isTaken = await firebaseService.isUsernameTaken(formattedUsername);
                if(isTaken) {
                    onSetTtsMessage(getTtsPrompt('signup_username_invalid', language));
                    setAuthError(getTtsPrompt('signup_username_invalid', language));
                    break;
                }
                setUsername(formattedUsername);
                setMode(AuthMode.SIGNUP_EMAIL);
                onSetTtsMessage(getTtsPrompt('signup_email', language));
                break;
            case AuthMode.SIGNUP_EMAIL:
                 const formattedEmail = cleanedText.toLowerCase().replace(/\s/g, '');
                 if (!formattedEmail.includes('@') || !formattedEmail.includes('.')) {
                    onSetTtsMessage("Please provide a valid email address.");
                    setAuthError("Please provide a valid email address.");
                    break;
                 }
                 setEmail(formattedEmail);
                 setMode(AuthMode.SIGNUP_PASSWORD);
                 onSetTtsMessage(getTtsPrompt('signup_password', language));
                 break;
            case AuthMode.SIGNUP_PASSWORD:
                setPassword(cleanedText);
                setMode(AuthMode.SIGNUP_CONFIRM_PASSWORD);
                onSetTtsMessage(getTtsPrompt('signup_confirm_password', language));
                break;
            case AuthMode.SIGNUP_CONFIRM_PASSWORD:
                if (password !== cleanedText) {
                    onSetTtsMessage(getTtsPrompt('signup_password_mismatch', language));
                    setAuthError(getTtsPrompt('signup_password_mismatch', language));
                    setPassword('');
                    setMode(AuthMode.SIGNUP_PASSWORD);
                } else {
                    const success = await firebaseService.signUpWithEmail(email, password, fullName, username);
                    if (!success) {
                        setAuthError("Could not create account. The email might be in use.");
                        onSetTtsMessage("Could not create account. The email might be in use.");
                        resetSignupState();
                        setMode(AuthMode.LOGIN);
                    }
                }
                break;
        }
      } catch (error: any) {
          console.error("Auth error:", error);
          const errorMessage = error.message || "An unexpected error occurred.";
          setAuthError(errorMessage);
          onSetTtsMessage(errorMessage);
          if (mode === AuthMode.LOGIN) {
            setIdentifier('');
          }
      } finally {
          setIsLoading(false);
      }
  }, [mode, identifier, password, email, fullName, username, onSetTtsMessage, language]);

  useEffect(() => {
    if (!lastCommand) return;
    
    const isLoginCommand = ['log in', 'login', 'login koro'].includes(lastCommand.toLowerCase());
    const isSignupCommand = ['sign up', 'signup', 'register'].includes(lastCommand.toLowerCase());

    if (isLoginCommand) {
        resetSignupState();
        setMode(AuthMode.LOGIN);
        onSetTtsMessage(getTtsPrompt('login_prompt', language));
        onCommandProcessed();
    } else if (isSignupCommand) {
        resetSignupState();
        setMode(AuthMode.SIGNUP_FULLNAME);
        onSetTtsMessage(getTtsPrompt('signup_fullname', language));
        onCommandProcessed();
    } else {
        handleTextInput(lastCommand).finally(onCommandProcessed);
    }
  }, [lastCommand, handleTextInput, onSetTtsMessage, onCommandProcessed, language]);
  
  const renderSignupProgress = () => {
    if (mode === AuthMode.LOGIN) return null;
    return (
        <div className="mt-4 text-left text-sm space-y-1 p-3 border border-lime-500/20 rounded-md bg-gray-900/30">
           {fullName && <p className="text-lime-400/80">Full Name: <span className="text-lime-300">{fullName}</span></p>}
           {username && <p className="text-lime-400/80">Username: <span className="text-lime-300">@{username}</span></p>}
           {email && <p className="text-lime-400/80">Email: <span className="text-lime-300">{email}</span></p>}
           {password && <p className="text-lime-400/80">Password: <span className="text-lime-300">********</span></p>}
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-lime-400 p-4 sm:p-8 bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(57,255,20,0.3),rgba(255,255,255,0))] opacity-20 pointer-events-none"></div>

      <Icon name="logo" className="w-24 h-24 text-lime-400 mb-4 text-shadow-lg" />
      <h1 className="text-5xl font-bold mb-2 text-shadow-lg">VoiceBook</h1>
      <p className="text-lime-400/80 mb-8 animate-pulse">[[ A U T H E N T I C A T E ]]</p>
      
      <div className="w-full max-w-sm">
        <div className="min-h-[3em]">
          {isLoading && <p className="animate-pulse">Processing...</p>}
        </div>
        {(mode > AuthMode.LOGIN) && renderSignupProgress()}
        {(mode === AuthMode.LOGIN && identifier) && <p className="text-lime-400/70 text-sm mt-4">Logging in as: <span className="text-lime-300">{identifier}</span></p>}
      </div>
    </div>
  );
};

export default AuthScreen;
