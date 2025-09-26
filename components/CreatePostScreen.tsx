import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RecordingState, User, Post } from '../types';
import { getTtsPrompt } from '../constants';
import Icon from './Icon';
import { geminiService } from '../services/geminiService';
import { firebaseService } from '../services/firebaseService';
import { useSettings } from '../contexts/SettingsContext';
import ImageCropper from './ImageCropper';
import Waveform from './Waveform';

interface CreatePostScreenProps {
  currentUser: User;
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

const FEELINGS = [
    { emoji: '😄', text: 'happy' }, { emoji: '😇', text: 'blessed' }, { emoji: '🥰', text: 'loved' },
    { emoji: '😢', text: 'sad' }, { emoji: '😠', text: 'angry' }, { emoji: '🤔', text: 'thinking' },
    { emoji: '🤪', text: 'crazy' }, { emoji: '🥳', text: 'celebrating' }, { emoji: '😎', text: 'cool' },
    { emoji: '😴', text: 'tired' }, { emoji: '🤩', text: 'excited' }, { emoji: '🙏', text: 'thankful' }
];

const EMOJI_PICKER_LIST = [
  '😀', '😂', '😍', '❤️', '👍', '🙏', '😭', '😮', '🤔', '🥳', '😎', '😢', '😠', '🎉', '🔥'
];

type SubView = 'main' | 'feelings'; // Removed 'audio'
type Feeling = { emoji: string; text: string };

const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ currentUser, onPostCreated, onSetTtsMessage, lastCommand, onDeductCoinsForImage, onCommandProcessed, onGoBack, groupId, groupName, startRecording }) => {
    const [caption, setCaption] = useState('');
    const [feeling, setFeeling] = useState<Feeling | null>(null);
    const [subView, setSubView] = useState<SubView>('main');
    const [isPosting, setIsPosting] = useState(false);
    const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
    
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
    const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    
    const handleDeleteAudio = useCallback(() => {
        stopTimer();
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setRecordingState(RecordingState.IDLE);
        setDuration(0);
        onSetTtsMessage("Audio recording discarded.");
    }, [audioUrl, onSetTtsMessage, stopTimer]);
    
    const handleStartRecording = useCallback(async () => {
        // Clear other media types when starting a new recording
        setUploadedImageFile(null);
        setUploadedImagePreview(null);
        
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setRecordingState(RecordingState.IDLE);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
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
    }, [audioUrl, onSetTtsMessage, startTimer, duration, language]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            stopTimer();
            setRecordingState(RecordingState.PREVIEW);
        }
    }, [stopTimer]);


    useEffect(() => {
        if (startRecording) {
            handleStartRecording();
        } else {
            onSetTtsMessage(`What's on your mind, ${currentUser.name.split(' ')[0]}?`);
        }
    }, [startRecording, currentUser.name, onSetTtsMessage, handleStartRecording]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setEmojiPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleDeleteAudio(); // Clear any existing audio recording
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleSaveCrop = (croppedImageBase64: string) => {
        setUploadedImagePreview(croppedImageBase64);
        const croppedFile = dataURLtoFile(croppedImageBase64, 'cropped_image.jpeg');
        if (croppedFile) {
            setUploadedImageFile(croppedFile);
        }
        setImageToCrop(null);
    };

    const handleCancelCrop = () => {
        setImageToCrop(null);
    };

    const handlePost = useCallback(async () => {
        const hasAudio = recordingState === RecordingState.PREVIEW && audioUrl;
        const hasContent = caption.trim() || uploadedImageFile || feeling || hasAudio;

        if (isPosting || !hasContent) {
            onSetTtsMessage("Please add some content before posting.");
            return;
        }
        
        setIsPosting(true);
        if (hasAudio) setRecordingState(RecordingState.UPLOADING);
        onSetTtsMessage("Publishing your post...");

        try {
            const postBaseData: any = {
                author: currentUser,
                caption: caption,
                status: groupId ? 'pending' : 'approved',
                feeling: feeling,
                groupId,
                groupName,
                duration: hasAudio ? duration : 0,
            };
            
            await firebaseService.createPost(
                postBaseData, 
                { 
                    mediaFile: uploadedImageFile,
                    audioBlobUrl: audioUrl
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
            if(hasAudio) setRecordingState(RecordingState.PREVIEW);
        }
    }, [isPosting, caption, currentUser, onSetTtsMessage, onPostCreated, onGoBack, uploadedImageFile, groupId, groupName, feeling, language, recordingState, audioUrl, duration]);

    const handleFeelingSelect = (selected: Feeling) => {
        setFeeling(selected);
        setSubView('main');
    };
    
    const renderMainView = () => (
        <>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 p-4">
                    <div className="flex items-center gap-3">
                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="font-bold text-slate-100 text-lg">
                                {currentUser.name}
                                {feeling && <span className="font-normal text-slate-400"> is feeling {feeling.emoji} {feeling.text}</span>}
                            </p>
                            <p className="text-sm text-slate-400">Public</p>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder={`What's on your mind, ${currentUser.name.split(' ')[0]}?`}
                            className="w-full bg-transparent text-slate-200 text-xl my-4 focus:outline-none resize-none"
                            rows={3}
                        />
                        <div className="absolute bottom-4 right-0" ref={emojiPickerRef}>
                            <button onClick={() => setEmojiPickerOpen(p => !p)} className="p-2 text-slate-400 hover:text-slate-200">
                                <Icon name="face-smile" className="w-6 h-6" />
                            </button>
                            {isEmojiPickerOpen && (
                                <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-700 p-2 rounded-lg grid grid-cols-5 gap-2 z-50 shadow-2xl">
                                    {EMOJI_PICKER_LIST.map(emoji => (
                                        <button key={emoji} onClick={() => setCaption(c => c + emoji)} className="text-2xl p-1 rounded-md hover:bg-slate-700 aspect-square flex items-center justify-center">{emoji}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto px-4">
                    {uploadedImagePreview && (
                        <div className="relative group pb-4">
                            <img src={uploadedImagePreview} alt="Post preview" className="aspect-video w-full rounded-lg object-cover" />
                            <button onClick={() => {setUploadedImagePreview(null); setUploadedImageFile(null);}} className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-50 group-hover:opacity-100 transition-opacity">
                                <Icon name="close" className="w-5 h-5"/>
                            </button>
                        </div>
                    )}

                    {recordingState !== RecordingState.IDLE && (
                         <div className="w-full flex flex-col items-center justify-center p-4 min-h-[150px] bg-slate-700/40 rounded-lg">
                            {recordingState === RecordingState.RECORDING && (
                                <>
                                    <p className="text-sm text-rose-400 mb-2">Recording...</p>
                                    <div className="w-full h-16">
                                        <Waveform isPlaying={false} isRecording={true}/>
                                    </div>
                                    <p className="text-xl font-mono mt-2">00:{duration.toString().padStart(2, '0')}</p>
                                    <button onClick={handleStopRecording} className="mt-4 p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white">
                                        <Icon name="pause" className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                            {recordingState === RecordingState.PREVIEW && audioUrl && (
                                <div className="text-center w-full space-y-3">
                                    <audio src={audioUrl} controls className="w-full h-10" />
                                    <div className="flex justify-center gap-4">
                                        <button onClick={handleDeleteAudio} className="px-4 py-2 text-sm rounded-lg bg-red-600/80 hover:bg-red-600 text-white font-semibold transition-colors">Delete</button>
                                        <button onClick={handleStartRecording} className="px-4 py-2 text-sm rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold transition-colors">Re-record</button>
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            </div>

            <footer className="flex-shrink-0 p-4 space-y-4">
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="border border-slate-700 rounded-lg p-3 flex items-center justify-around">
                     <button onClick={handleStartRecording} className="flex items-center gap-2 text-rose-400 font-semibold p-2 rounded-md hover:bg-slate-700/50"><Icon name="mic" className="w-6 h-6"/> Voice</button>
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-green-400 font-semibold p-2 rounded-md hover:bg-slate-700/50"><Icon name="photo" className="w-6 h-6"/> Photo</button>
                     <button onClick={() => setSubView('feelings')} className="flex items-center gap-2 text-yellow-400 font-semibold p-2 rounded-md hover:bg-slate-700/50"><Icon name="face-smile" className="w-6 h-6"/> Feeling</button>
                </div>

                <button onClick={handlePost} disabled={isPosting || (!caption.trim() && !uploadedImagePreview && !feeling && recordingState !== RecordingState.PREVIEW)} className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg text-lg">
                    {isPosting ? 'Posting...' : 'Post'}
                </button>
            </footer>
        </>
    );
    
    const renderFeelingsView = () => {
         const [search, setSearch] = useState('');
         const filteredFeelings = FEELINGS.filter(f => f.text.toLowerCase().includes(search.toLowerCase()));

        return (
            <div className={`w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]`}>
                <header className="flex-shrink-0 p-4 border-b border-slate-700 flex items-center justify-center relative">
                    <button onClick={() => setSubView('main')} className="absolute top-1/2 -translate-y-1/2 left-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-full">
                        <Icon name="back" className="w-5 h-5 text-slate-300" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-100">How are you feeling?</h2>
                </header>
                <div className="p-4 flex-shrink-0">
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="w-full bg-slate-700 border-slate-600 rounded-full p-2.5 pl-4"/>
                </div>
                <main className="flex-grow p-4 pt-0 overflow-y-auto grid grid-cols-2 gap-2">
                    {filteredFeelings.map(f => (
                        <button key={f.text} onClick={() => handleFeelingSelect(f)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50">
                            <span className="text-3xl">{f.emoji}</span>
                            <span className="font-semibold capitalize text-slate-200">{f.text}</span>
                        </button>
                    ))}
                </main>
            </div>
        )
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onGoBack}>
             {imageToCrop && (
                <ImageCropper
                    imageUrl={imageToCrop}
                    aspectRatio={16 / 9}
                    onSave={handleSaveCrop}
                    onCancel={handleCancelCrop}
                    isUploading={isPosting}
                />
            )}
            <div onClick={e => e.stopPropagation()}>
                {subView === 'feelings' ? renderFeelingsView() : (
                    <div className={`w-full max-w-lg bg-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto`}>
                         <header className="flex-shrink-0 p-4 border-b border-slate-700 flex items-center justify-center relative">
                            <h2 className="text-xl font-bold text-slate-100">Create post</h2>
                            <button onClick={onGoBack} className="absolute top-1/2 -translate-y-1/2 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-full">
                                <Icon name="close" className="w-5 h-5 text-slate-300" />
                            </button>
                        </header>
                        {renderMainView()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatePostScreen;
