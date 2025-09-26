
import React, { useState, useEffect, useRef } from 'react';
import { User, Story, MusicTrack, StoryTextStyle, StoryPrivacy, AppView } from '../types';
import { geminiService } from '../services/geminiService';
import { getTtsPrompt, TEXT_STORY_STYLES, MOCK_GALLERY_ITEMS } from '../constants';
import Icon from './Icon';
import Waveform from './Waveform';
import { useSettings } from '../contexts/SettingsContext';

interface CreateStoryScreenProps {
  currentUser: User;
  onStoryCreated: (newStory: Story) => void;
  onGoBack: () => void;
  onSetTtsMessage: (message: string) => void;
  onNavigate: (view: AppView, props?: any) => void;
  lastCommand: string | null;
  onCommandProcessed: () => void;
  initialText?: string;
}

type EditorMode = 'text' | 'media';

const MusicPicker: React.FC<{
    onSelect: (track: MusicTrack) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [library, setLibrary] = useState<MusicTrack[]>([]);
    const [filtered, setFiltered] = useState<MusicTrack[]>([]);
    const [lang, setLang] = useState<'bangla' | 'hindi'>('bangla');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const music = geminiService.getMusicLibrary();
        setLibrary(music);
    }, []);
    
    useEffect(() => {
        setFiltered(
            library.filter(t => t.language === lang && (t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase())))
        );
    }, [library, lang, search]);

    return (
        <div className="absolute inset-0 bg-slate-800/95 backdrop-blur-sm z-30 flex flex-col p-4 animate-fade-in-fast">
             <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-xl font-bold">Add Music</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700"><Icon name="close" className="w-6 h-6" /></button>
            </div>
            <div className="flex gap-2 mb-4 flex-shrink-0">
                <button onClick={() => setLang('bangla')} className={`px-4 py-2 rounded-full text-sm font-semibold ${lang === 'bangla' ? 'bg-rose-600 text-white' : 'bg-slate-700'}`}>Bangla</button>
                <button onClick={() => setLang('hindi')} className={`px-4 py-2 rounded-full text-sm font-semibold ${lang === 'hindi' ? 'bg-rose-600 text-white' : 'bg-slate-700'}`}>Hindi</button>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for a song..." className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 mb-4 flex-shrink-0"/>
            <div className="flex-grow overflow-y-auto">
                {filtered.map(track => (
                    <button key={track.id} onClick={() => onSelect(track)} className="w-full text-left p-2 hover:bg-slate-700 rounded-md flex items-center gap-3">
                        <Icon name="play" className="w-8 h-8 p-2 bg-slate-600 rounded-full" />
                        <div>
                            <p className="font-semibold">{track.title}</p>
                            <p className="text-sm text-slate-400">{track.artist}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const CreateStoryScreen: React.FC<CreateStoryScreenProps> = ({ currentUser, onStoryCreated, onGoBack, onSetTtsMessage, onNavigate, lastCommand, onCommandProcessed, initialText }) => {
    // Initialize state directly from props for reliability
    const [view, setView] = useState<'gallery' | 'editor'>(initialText ? 'editor' : 'gallery');
    const [editorMode, setEditorMode] = useState<EditorMode>(initialText ? 'text' : 'media');
    const [text, setText] = useState(initialText || '');
    const { language } = useSettings();
    
    // Other state
    const [textStyle, setTextStyle] = useState<StoryTextStyle>(TEXT_STORY_STYLES[0]);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
    const [isMusicPickerOpen, setMusicPickerOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [privacy, setPrivacy] = useState<StoryPrivacy>('public');

    const mediaInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialText) {
            onSetTtsMessage(`Text set. You can now add music or share your story.`);
        } else {
            onSetTtsMessage("Select a photo or video to start your story.");
        }
        
        return () => {
             if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialText]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (mediaPreview) URL.revokeObjectURL(mediaPreview);
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
            setEditorMode('media');
            setView('editor');
        }
    };

    const handleGallerySelect = (item: typeof MOCK_GALLERY_ITEMS[0]) => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(null); // It's a mock URL, not a real file
        setMediaPreview(item.url);
        setEditorMode('media');
        setView('editor');
    }
    
    const handleTextModeSelect = () => {
        setEditorMode('text');
        setText('Start Typing...');
        setMediaFile(null);
        setMediaPreview(null);
        setView('editor');
        onSetTtsMessage("Text story selected. Say 'add text [your text]' to begin.");
    };

    const handleBackToGallery = () => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        setMediaFile(null);
        setMediaPreview(null);
        setSelectedMusic(null);
        setView('gallery');
        onSetTtsMessage("Back to gallery. Select a photo, or say 'back' again to exit.");
    };

    const handlePublish = async () => {
        if (isPublishing) return;

        const canPublish = (editorMode === 'text' && text.trim() !== '') || (editorMode === 'media' && mediaPreview);
        if (!canPublish) {
            onSetTtsMessage("Please add some content before sharing.");
            return;
        }

        setIsPublishing(true);
        onSetTtsMessage("Sharing your story...");

        try {
            const storyType = editorMode === 'text' 
                ? 'text' 
                : mediaFile?.type.startsWith('video') || mediaPreview?.endsWith('.mp4')
                ? 'video' 
                : 'image';
                
            const newStory = await geminiService.createStory({
                author: currentUser,
                type: storyType,
                text: editorMode === 'text' ? text : undefined,
                textStyle: editorMode === 'text' ? textStyle : undefined,
                contentUrl: editorMode === 'media' && !mediaFile ? mediaPreview! : undefined,
                music: selectedMusic || undefined,
                privacy: privacy
            }, editorMode === 'media' ? mediaFile : null);

            if (newStory) {
                onStoryCreated(newStory);
            } else {
                throw new Error("Story creation service returned no data.");
            }
        } catch (error) {
            console.error("Failed to publish story:", error);
            onSetTtsMessage("Failed to share story. Please try again.");
            setIsPublishing(false);
        }
    };

    useEffect(() => {
        if (!lastCommand) return;

        const processCommand = async () => {
            const intentResponse = await geminiService.processIntent(lastCommand);
            const { intent, slots } = intentResponse;

            if (intent === 'intent_add_text_to_story') {
                const newText = slots?.text as string;
                if (newText) {
                    if (view !== 'editor' || editorMode !== 'text') {
                        setEditorMode('text');
                        setMediaFile(null);
                        setMediaPreview(null);
                        setView('editor');
                    }
                    setText(newText);
                    onSetTtsMessage(`Text set to: "${newText}"`);
                }
                onCommandProcessed();
                return;
            }

            if (intent === 'intent_go_back') {
                 if (view === 'editor') {
                     if (isMusicPickerOpen) {
                        setMusicPickerOpen(false);
                        onSetTtsMessage("Music picker closed.");
                    } else {
                        handleBackToGallery();
                    }
                 } else {
                     onGoBack();
                 }
                 onCommandProcessed();
                 return;
            }

            if (view === 'editor') {
                switch (intent) {
                    case 'intent_add_music':
                        setMusicPickerOpen(true);
                        onSetTtsMessage("Select music for your story.");
                        break;
                    case 'intent_post_story':
                        handlePublish();
                        break;
                    case 'intent_set_story_privacy':
                        const privacyLevel = slots?.privacy_level as StoryPrivacy;
                        if (privacyLevel && ['public', 'friends'].includes(privacyLevel)) {
                            setPrivacy(privacyLevel);
                            onSetTtsMessage(`Story privacy set to ${privacyLevel}.`);
                        }
                        break;
                }
            }
            
            onCommandProcessed();
        };
        processCommand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastCommand]);

    const canPublish = (editorMode === 'text' && text.trim() !== '') || (editorMode === 'media' && mediaPreview);

    const renderEditor = () => (
        <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-800">
            <header className="w-full flex justify-between items-center">
                <button onClick={handleBackToGallery}><Icon name="back" className="w-8 h-8" /></button>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate(AppView.STORY_PRIVACY, { currentPrivacy: privacy, onSave: setPrivacy, onGoBack: onGoBack })} className="flex items-center gap-2 bg-slate-700/70 px-3 py-2 rounded-full text-sm">
                        <Icon name={privacy === 'public' ? 'globe' : 'users'} className="w-4 h-4" />
                        <span className="capitalize">{privacy}</span>
                    </button>
                    <button onClick={() => setMusicPickerOpen(true)} className="flex items-center gap-2 bg-slate-700/70 px-3 py-2 rounded-full text-sm"><Icon name="speaker-wave" className="w-4 h-4" /> Music</button>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center w-full my-4">
                <div className={`aspect-[9/16] w-full max-w-[320px] rounded-lg overflow-hidden relative ${editorMode === 'text' ? textStyle.backgroundColor : 'bg-black'} flex items-center justify-center p-4 shadow-2xl`}>
                    {editorMode === 'text' && <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Start typing" className={`w-full bg-transparent text-3xl font-bold focus:outline-none resize-none ${textStyle.fontFamily} ${textStyle.color} ${'text-' + textStyle.textAlign}`} />}
                    {editorMode === 'media' && mediaPreview && (
                        mediaFile?.type.startsWith('video') || mediaPreview.endsWith('mp4')
                            ? <video src={mediaPreview} autoPlay muted loop className="w-full h-full object-cover"/>
                            : <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover"/>
                    )}
                    {selectedMusic && <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm"><Icon name="speaker-wave" className="w-3 h-3"/> {selectedMusic.title}</div>}
                    {editorMode === 'text' && (
                        <div className="absolute bottom-4 flex gap-2 overflow-x-auto p-2">
                            {TEXT_STORY_STYLES.map(style => (
                                <button key={style.name} onClick={() => setTextStyle(style)} className={`w-10 h-10 rounded-full flex-shrink-0 ${style.backgroundColor} ring-2 ${textStyle.name === style.name ? 'ring-white' : 'ring-transparent'}`}>
                                    <span className={`${style.fontFamily} ${style.color}`}>Aa</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="w-full">
                <button onClick={handlePublish} disabled={isPublishing || !canPublish} className="w-full max-w-sm mx-auto bg-white text-black font-bold py-3 px-4 rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPublishing ? 'Sharing...' : 'Share Story'}
                </button>
            </footer>

            {isMusicPickerOpen && <MusicPicker onSelect={(track) => { setSelectedMusic(track); setMusicPickerOpen(false); }} onClose={() => setMusicPickerOpen(false)} />}
        </div>
    );
    
    const renderGallery = () => (
        <div className="h-full w-full flex flex-col bg-slate-900 text-white">
            <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-slate-700">
                <button onClick={onGoBack}><Icon name="close" className="w-7 h-7" /></button>
                <h1 className="text-xl font-bold">Create story</h1>
                <div className="w-7"></div>
            </header>
            <div className="flex-shrink-0 p-4 border-b border-slate-700">
                 <div className="flex gap-3">
                    <button onClick={handleTextModeSelect} className="flex-1 bg-slate-800 p-3 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Icon name="edit" className="w-6 h-6 text-rose-400" />
                        <span className="font-semibold">Text</span>
                    </button>
                    <button onClick={() => setMusicPickerOpen(true)} className="flex-1 bg-slate-800 p-3 rounded-lg flex flex-col items-center justify-center gap-2">
                        <Icon name="speaker-wave" className="w-6 h-6 text-emerald-400" />
                        <span className="font-semibold">Music</span>
                    </button>
                 </div>
            </div>
            <main className="flex-grow overflow-y-auto p-2">
                 <div className="flex justify-between items-center p-2">
                    <h2 className="font-bold text-lg">Gallery</h2>
                    <button onClick={() => mediaInputRef.current?.click()} className="bg-slate-700 text-sm font-semibold px-4 py-2 rounded-full">Select from device</button>
                    <input type="file" accept="image/*,video/*" ref={mediaInputRef} onChange={handleFileChange} className="hidden"/>
                </div>
                <div className="grid grid-cols-3 gap-1 pb-32 md:pb-1">
                    {MOCK_GALLERY_ITEMS.map(item => (
                        <button key={item.id} onClick={() => handleGallerySelect(item)} className="aspect-square bg-slate-800 relative overflow-hidden">
                           {item.type === 'video' ? (
                                <video src={item.url} muted className="w-full h-full object-cover"/>
                           ) : (
                                <img src={item.url} alt="Gallery item" className="w-full h-full object-cover"/>
                           )}
                           {item.duration && <span className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">0:{item.duration.toString().padStart(2, '0')}</span>}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );

    return (
      <div className="fixed inset-0 z-50 bg-slate-900">
        {view === 'gallery' ? renderGallery() : renderEditor()}
      </div>
    );
};

export default CreateStoryScreen;
