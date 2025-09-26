
import React, { useState, useEffect, useCallback } from 'react';
import { AuthMode } from './types';
import { firebaseService } from './services/firebaseService';
import Icon from './components/Icon';
import { getTtsPrompt } from './constants';
import { useSettings } from './contexts/SettingsContext';

interface AuthScreenProps {
  ttsMessage: string;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  initialAuthError?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ ttsMessage, onSetTtsMessage, lastCommand, onCommandProcessed, initialAuthError }) => {
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN);
  
  // State for login
  const [identifier, setIdentifier] = useState('');

  // State for signup
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
                    // onAuthSuccess is handled by the onAuthStateChanged listener in UserApp.
                    // The catch block below will handle any failures.
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
                    // Create user in Firebase
                    const success = await firebaseService.signUpWithEmail(email, password, fullName, username);
                    if (!success) {
                        setAuthError("Could not create account. The email might be in use.");
                        onSetTtsMessage("Could not create account. The email might be in use.");
                        resetSignupState();
                        setMode(AuthMode.LOGIN);
                    }
                     // onAuthSuccess is handled by the onAuthStateChanged listener in UserApp
                }
                break;
        }
      } catch (error: any) {
          console.error("Auth error:", error);
          setAuthError(error.message || "An unexpected error occurred.");
          onSetTtsMessage(error.message || "An unexpected error occurred.");
          if (mode === AuthMode.LOGIN) {
            setIdentifier(''); // Clear identifier on login failure
          }
      } finally {
          setIsLoading(false);
      }
  }, [mode, identifier, fullName, username, email, password, onSetTtsMessage, language]);


  useEffect(() => {
    if (!lastCommand) return;
    
    // For Auth screen, we assume any command that isn't 'login' or 'signup' is input.
    // A more complex NLU could be used here, but this is simpler.
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
        <div className="mt-4 text-left text-sm space-y-1">
           {fullName && <p className="text-gray-500">Full Name: <span className="text-gray-800">{fullName}</span></p>}
           {username && <p className="text-gray-500">Username: <span className="text-gray-800">@{username}</span></p>}
           {email && <p className="text-gray-500">Email: <span className="text-gray-800">{email}</span></p>}
           {password && <p className="text-gray-500">Password: <span className="text-gray-800">********</span></p>}
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-800 p-8 bg-slate-100">
      <Icon name="logo" className="w-24 h-24 text-blue-600 mb-6" />
      <h1 className="text-4xl font-bold mb-8">VoiceBook</h1>
      
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
        <p className={`font-medium text-lg min-h-[3em] flex items-center justify-center ${authError ? 'text-red-500' : 'text-blue-600'}`}>
          {isLoading ? 'Processing...' : (authError || ttsMessage)}
        </p>
        { (mode > AuthMode.LOGIN) && renderSignupProgress() }
        { (mode === AuthMode.LOGIN && identifier) && <p className="text-gray-500 text-sm mt-4">Logging in as: <span className="text-gray-800">{identifier}</span></p> }
      </div>
    </div>
  );
};

export default AuthScreen;
