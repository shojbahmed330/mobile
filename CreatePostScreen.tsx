
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingState, User, Post, PollOption } from './types';
import { IMAGE_GENERATION_COST, getTtsPrompt } from './constants';
import Waveform from './components/Waveform';
import Icon from './components/Icon';
import { geminiService } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { useSettings } from './contexts/SettingsContext';

interface CreatePostScreenProps {
  user: User;
  onPostCreated: (newPost: Post | null) => void;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  onDeductCoinsForImage: () => Promise<boolean>;
  onCommandProcessed: () => void;
  onGoBack: () => void;
  groupId?: string;
  groupName?: string;
  startRecording?: boolean;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ user, onPostCreated, onSetTtsMessage, lastCommand, onDeductCoinsForImage, onCommandProcessed, onGoBack, groupId, groupName, startRecording }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  
  // New state for image generation
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // New state for polls
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  
  // New state for media uploads
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for real audio recording
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isPosting, setIsPosting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { language } = useSettings();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  }, [stopTimer]);
  
  const clearOtherInputs = () => {
    setGeneratedImageUrl(null);
    setImagePrompt('');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setMediaFile(null);
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelectClick = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
        fileInputRef.current.accept = `${type}/*`;
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setMediaFile(file);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        if (mediaPreviewUrl) {
            URL.revokeObjectURL(mediaPreviewUrl);
        }
        setMediaPreviewUrl(URL.createObjectURL(file));
        clearOtherInputs();
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl(null);
    setMediaType(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleStartRecording = useCallback(async () => {
    if (recordingState === RecordingState.RECORDING || mediaFile) return;
    clearMedia();
    clearOtherInputs();

    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);
            stream.getTracks().forEach(track => track.stop());
            onSetTtsMessage(getTtsPrompt('record_stopped', language, { duration }));
        };
        
        recorder.start();
        setRecordingState(RecordingState.RECORDING);
        onSetTtsMessage(getTtsPrompt('record_start', language));
        startTimer();

    } catch (err: any) {
        console.error("Mic permission error:", err);
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            onSetTtsMessage(getTtsPrompt('error_mic_not_found', language));
        } else {
            onSetTtsMessage(getTtsPrompt('error_mic_permission', language));
        }
    }
  }, [recordingState, mediaFile, audioUrl, onSetTtsMessage, startTimer, duration, language]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        stopTimer();
        setRecordingState(RecordingState.PREVIEW);
    }
  }, [stopTimer]);

  useEffect(() => {
    if(startRecording) {
        handleStartRecording();
    } else {
        onSetTtsMessage(getTtsPrompt('create_post_prompt', language, { cost: IMAGE_GENERATION_COST }));
    }
    return () => {
        stopTimer();
        if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
    };
  }, [startRecording, onSetTtsMessage, stopTimer, handleStartRecording, mediaPreviewUrl, audioUrl, language]);
  
  const handleGenerateImage = useCallback(async () => {
    if (!imagePrompt.trim() || isGeneratingImage || mediaFile) return;

    if ((user.voiceCoins || 0) < IMAGE_GENERATION_COST) {
        onSetTtsMessage(getTtsPrompt('image_generation_insufficient_coins', language, { cost: IMAGE_GENERATION_COST, balance: user.voiceCoins || 0 }));
        return;
    }

    const paymentSuccess = await onDeductCoinsForImage();
    if (!paymentSuccess) {
        return;
    }
    
    clearMedia();
    clearOtherInputs();
    setIsGeneratingImage(true);
    onSetTtsMessage("Generating your masterpiece...");
    const imageUrl = await geminiService.generateImageForPost(imagePrompt);
    setIsGeneratingImage(false);
    
    if(imageUrl) {
        setGeneratedImageUrl(imageUrl);
        onSetTtsMessage(`Image generated! You can now add a caption or voice note.`);
    } else {
        onSetTtsMessage(`Sorry, I couldn't generate an image for that prompt. Please try another one.`);
    }
  }, [imagePrompt, isGeneratingImage, onSetTtsMessage, user.voiceCoins, onDeductCoinsForImage, mediaFile, language]);

  const handleClearImage = useCallback(() => {
    setGeneratedImageUrl(null);
    setImagePrompt('');
    onSetTtsMessage('Image cleared.');
  }, [onSetTtsMessage]);

  const handlePost = useCallback(async () => {
    const hasPoll = showPollCreator && pollQuestion.trim() && pollOptions.every(opt => opt.trim());
    const hasMedia = mediaFile && mediaPreviewUrl;
    const hasAudio = recordingState === RecordingState.PREVIEW && audioUrl;
    const hasContent = caption.trim() || hasAudio || generatedImageUrl || hasPoll || hasMedia;

    if (isPosting || !hasContent) {
        onSetTtsMessage("Please add some content before posting.");
        return;
    };
    
    setIsPosting(true);
    setRecordingState(RecordingState.UPLOADING);
    onSetTtsMessage("Publishing your post...");

    try {
        const postBaseData: any = {
            author: user,
            duration: hasAudio ? duration : 0,
            caption: caption,
            status: groupId ? 'pending' : 'approved',
            comments: [],
            likedBy: [],
        };
        
        if (generatedImageUrl) {
            postBaseData.imagePrompt = imagePrompt;
        }
        if (groupId) {
            postBaseData.groupId = groupId;
        }
        if (groupName) {
            postBaseData.groupName = groupName;
        }
        if (hasPoll) {
            postBaseData.poll = {
                question: pollQuestion,
                options: pollOptions.filter(opt => opt.trim()).map(opt => ({ text: opt, votes: 0, votedBy: [] }))
            };
        }
        
        await firebaseService.createPost(
            postBaseData, 
            {
                mediaFile: mediaFile,
                audioBlobUrl: audioUrl,
                generatedImageBase64: generatedImageUrl
            }
        );

        if (postBaseData.status === 'pending') {
            onSetTtsMessage(getTtsPrompt('post_pending_approval', language));
            setTimeout(() => onGoBack(), 1500); 
        } else {
            onPostCreated(null);
        }
    } catch (error: any) {
        console.error("Failed to create post:", error);
        onSetTtsMessage(`Failed to create post: ${error.message}`);
        setIsPosting(false);
        setRecordingState(RecordingState.IDLE);
    }
  }, [isPosting, caption, duration, user, onSetTtsMessage, onPostCreated, onGoBack, generatedImageUrl, imagePrompt, groupId, groupName, showPollCreator, pollQuestion, pollOptions, mediaFile, mediaPreviewUrl, audioUrl, recordingState, language]);
  
  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  
  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = [...pollOptions];
      newOptions.splice(index, 1);
      setPollOptions(newOptions);
    }
  };

  useEffect(() => {
    if (!lastCommand) return;
    
    const processCommand = async () => {
        try {
            const intentResponse = await geminiService.processIntent(lastCommand);
            
            switch(intentResponse.intent) {
                case 'intent_go_back':
                    onGoBack();
                    break;
                case 'intent_create_post': 
                    handleStartRecording();
                    break;
                case 'intent_stop_recording':
                    if (recordingState === RecordingState.RECORDING) handleStopRecording();
                    break;
                case 'intent_re_record':
                     if (recordingState === RecordingState.PREVIEW) {
                         setDuration(0);
                         handleStartRecording();
                     }
                     break;
                case 'intent_post_confirm':
                    handlePost();
                    break;
                case 'intent_generate_image':
                    if (intentResponse.slots?.prompt) {
                        const promptText = intentResponse.slots.prompt as string;
                        setImagePrompt(promptText);
                        setTimeout(() => handleGenerateImage(), 100);
                    }
                    break;
                case 'intent_clear_image':
                    handleClearImage();
                    break;
                case 'intent_create_poll':
                    setShowPollCreator(true);
                    onSetTtsMessage("Poll creator opened. Please type the question and options.");
                    break;
            }
        } catch (error) {
            console.error("Error processing command in CreatePostScreen:", error);
        } finally {
            onCommandProcessed();
        }
    };
    
    processCommand();
  }, [lastCommand, recordingState, handleStartRecording, handleStopRecording, handlePost, handleGenerateImage, handleClearImage, onCommandProcessed, onGoBack, onSetTtsMessage]);

  const canAffordImage = (user.voiceCoins || 0) >= IMAGE_GENERATION_COST;

  const renderRecordingControls = () => {
      switch (recordingState) {
          case RecordingState.IDLE:
              return (
                  <button onClick={handleStartRecording} className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                      <Icon name="mic" className="w-6 h-6" />
                      <span>Record Voice</span>
                  </button>
              );
          case RecordingState.RECORDING:
              return (
                  <div className="w-full flex flex-col items-center gap-4">
                      <div className="w-full h-24 bg-slate-700/50 rounded-lg overflow-hidden">
                          <Waveform isPlaying={true} isRecording={true} />
                      </div>
                       <div className="text-2xl font-mono text-slate-300">
                          00:{duration.toString().padStart(2, '0')}
                      </div>
                      <button onClick={handleStopRecording} className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-colors">
                          <Icon name="pause" className="w-8 h-8" />
                          <span className="sr-only">Stop Recording</span>
                      </button>
                  </div>
              );
          case RecordingState.PREVIEW:
              return (
                 <div className="w-full flex flex-col items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
                      <p className="font-semibold text-slate-200">Voice Recorded: {duration}s</p>
                      {audioUrl && <audio src={audioUrl} controls className="w-full" />}
                      <div className="flex gap-4">
                        <button onClick={handleStartRecording} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Re-record</button>
                        <p className="text-slate-400 self-center">Ready to post?</p>
                      </div>
                  </div>
              )
          case RecordingState.UPLOADING:
          case RecordingState.POSTED:
             return <p className="text-lg text-rose-400">{isPosting ? 'Publishing your post...' : 'Posted successfully!'}</p>
      }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-lg bg-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <h2 className="text-3xl font-bold">Create Post</h2>
        {groupName && (
            <div className="text-sm text-center bg-slate-700/50 p-2 rounded-md text-slate-300">
                Posting in <span className="font-bold text-rose-400">{groupName}</span>
            </div>
        )}
        
         <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        <div className="flex items-start gap-4">
             <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mt-2" />
             <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder={`What's on your mind, ${user.name.split(' ')[0]}?`}
                className="flex-grow bg-transparent text-slate-100 text-lg rounded-lg focus:ring-0 focus:outline-none min-h-[100px] resize-none"
                rows={3}
             />
        </div>

        {mediaPreviewUrl && (
            <div className="relative group/media">
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                    {mediaType === 'image' ? (
                        <img src={mediaPreviewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                    ) : (
                        <video src={mediaPreviewUrl} controls className="max-h-full max-w-full rounded-lg" />
                    )}
                </div>
                <button onClick={clearMedia} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white opacity-50 group-hover/media:opacity-100 transition-opacity" aria-label="Clear media">
                    <Icon name="close" className="w-5 h-5"/>
                </button>
            </div>
        )}

        {showPollCreator && (
            <div className="border-t border-b border-slate-700 py-6 space-y-4">
                <h3 className="text-xl font-semibold text-left text-rose-400">Create a Poll</h3>
                <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question..." className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2.5" />
                <div className="space-y-2">
                    {pollOptions.map((opt, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input type="text" value={opt} onChange={e => handlePollOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} className="flex-grow bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2.5" />
                            {pollOptions.length > 2 && <button onClick={() => removePollOption(index)} className="p-2 text-slate-400 hover:text-red-400">&times;</button>}
                        </div>
                    ))}
                </div>
                {pollOptions.length < 5 && <button onClick={addPollOption} className="text-sm text-sky-400 hover:underline">Add option</button>}
            </div>
        )}
        
        {recordingState !== RecordingState.IDLE && !mediaPreviewUrl && !generatedImageUrl && !showPollCreator && (
            <div className="border-t border-b border-slate-700 py-6">
                {renderRecordingControls()}
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-around items-center border-y border-slate-700 py-2">
            <button onClick={handleStartRecording} disabled={!!mediaPreviewUrl} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="mic" className="w-6 h-6 text-rose-500"/> <span className="font-semibold text-slate-300">Voice</span>
            </button>
             <button onClick={() => handleFileSelectClick('image')} disabled={recordingState !== RecordingState.IDLE} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="photo" className="w-6 h-6 text-green-400"/> <span className="font-semibold text-slate-300">Photo</span>
            </button>
             <button onClick={() => handleFileSelectClick('video')} disabled={recordingState !== RecordingState.IDLE} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Icon name="video-camera" className="w-6 h-6 text-sky-400"/> <span className="font-semibold text-slate-300">Video</span>
            </button>
            <button onClick={() => setShowPollCreator(s => !s)} disabled={!!mediaPreviewUrl || recordingState !== RecordingState.IDLE} className={`flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${showPollCreator ? 'bg-rose-500/20' : ''}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <span className="font-semibold text-slate-300">Poll</span>
            </button>
        </div>

        {/* Image Generation Section */}
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-left text-rose-400">Add an AI Image (Optional)</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateImage(); }}
                    placeholder="Describe the image you want to create..."
                    className="flex-grow bg-slate-700 border border-slate-600 text-slate-100 rounded-lg p-2.5 focus:ring-rose-500 focus:border-rose-500 transition disabled:opacity-40"
                    disabled={isGeneratingImage || !!mediaPreviewUrl}
                />
                <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim() || !canAffordImage || !!mediaPreviewUrl}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center min-w-[160px]"
                >
                    {isGeneratingImage 
                        ? <Icon name="logo" className="w-6 h-6 animate-spin"/> 
                        : `Generate (${IMAGE_GENERATION_COST} Coins)`
                    }
                </button>
            </div>
             {!canAffordImage && (
                <p className="text-xs text-yellow-500 text-left">You don't have enough coins. Watch an ad in the feed to earn more!</p>
             )}
            {isGeneratingImage && (
                <div className="aspect-square bg-slate-700/50 rounded-lg flex items-center justify-center flex-col gap-3 text-slate-300">
                    <Icon name="logo" className="w-12 h-12 text-rose-500 animate-spin"/>
                    <p>Generating your masterpiece...</p>
                </div>
            )}
            {generatedImageUrl && !isGeneratingImage && (
                <div className="relative group">
                    <img src={generatedImageUrl} alt={imagePrompt} className="aspect-square w-full rounded-lg object-cover" />
                    <button 
                        onClick={handleClearImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-50 group-hover:opacity-100 transition-opacity"
                        aria-label="Clear image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>
        
        <button 
          onClick={handlePost} 
          disabled={isPosting}
          className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
        >
            {isPosting ? 'Publishing...' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default CreatePostScreen;
