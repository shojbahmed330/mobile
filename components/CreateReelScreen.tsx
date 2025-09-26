import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Post } from '../types';
import { firebaseService } from '../services/firebaseService';
import { REEL_TEXT_FONTS } from '../constants';
import Icon from './Icon';

interface CreateReelScreenProps {
  currentUser: User;
  onGoBack: () => void;
  onReelCreated: () => void;
  onSetTtsMessage: (message: string) => void;
}

type EditorStep = 'select' | 'edit' | 'publish';

const CreateReelScreen: React.FC<CreateReelScreenProps> = ({ currentUser, onGoBack, onReelCreated, onSetTtsMessage }) => {
    const [step, setStep] = useState<EditorStep>('select');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [captionStyle, setCaptionStyle] = useState({
        fontFamily: 'Sans',
        fontWeight: 'normal' as 'normal' | 'bold',
        fontStyle: 'normal' as 'normal' | 'italic',
    });
    const [isPublishing, setIsPublishing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        onSetTtsMessage("Select a video to create your Reel.");
        return () => {
            if (videoPreview) URL.revokeObjectURL(videoPreview);
        };
    }, [onSetTtsMessage, videoPreview]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            if (videoPreview) URL.revokeObjectURL(videoPreview);
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
            setStep('edit');
        } else {
            onSetTtsMessage("Please select a valid video file.");
        }
    };
    
    const handlePublish = async () => {
        if (!videoFile || isPublishing) return;
        setIsPublishing(true);
        onSetTtsMessage("Publishing your Reel...");
        
        try {
            await firebaseService.createPost(
                { author: currentUser, caption, captionStyle, duration: 0 },
                { mediaFile: videoFile }
            );
            onReelCreated();
        } catch (error) {
            console.error("Failed to publish reel:", error);
            onSetTtsMessage("Sorry, there was an error publishing your Reel.");
            setIsPublishing(false);
        }
    };

    const header = useMemo(() => {
        if (step === 'select') {
            return (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                    <h1 className="text-2xl font-bold">New Reel</h1>
                    <button onClick={onGoBack}><Icon name="close" className="w-7 h-7" /></button>
                </div>
            )
        }
        if (step === 'edit') {
            return (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                    <button onClick={() => setStep('select')}><Icon name="back" className="w-7 h-7" /></button>
                    <button onClick={() => setStep('publish')} className="px-4 py-2 bg-rose-600 rounded-lg font-bold">Next</button>
                </div>
            )
        }
        if (step === 'publish') {
            return (
                 <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                    <button onClick={() => setStep('edit')}><Icon name="back" className="w-7 h-7" /></button>
                    <h1 className="text-2xl font-bold">New Reel</h1>
                    <div className="w-7" />
                </div>
            )
        }
    }, [step, onGoBack]);

    const cycleFont = () => {
        const currentIndex = REEL_TEXT_FONTS.findIndex(f => f.name === captionStyle.fontFamily);
        const nextIndex = (currentIndex + 1) % REEL_TEXT_FONTS.length;
        setCaptionStyle(s => ({ ...s, fontFamily: REEL_TEXT_FONTS[nextIndex].name }));
    };
    const toggleBold = () => setCaptionStyle(s => ({ ...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' }));
    const toggleItalic = () => setCaptionStyle(s => ({ ...s, fontStyle: s.fontStyle === 'italic' ? 'normal' : 'italic' }));

    const font = REEL_TEXT_FONTS.find(f => f.name === captionStyle.fontFamily);
    const fontClass = font ? font.class : 'font-sans';
    const fontWeightClass = captionStyle.fontWeight === 'bold' ? 'font-bold' : '';
    const fontStyleClass = captionStyle.fontStyle === 'italic' ? 'italic' : '';

    return (
        <div className="fixed inset-0 bg-slate-900 z-40 text-white flex flex-col items-center justify-center">
            {header}
            
            {step === 'select' && (
                <div className="flex flex-col items-center gap-6">
                    <Icon name="video-camera" className="w-24 h-24 text-slate-600" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-rose-600 hover:bg-rose-500 font-bold py-3 px-6 rounded-lg text-lg">
                        Select from Device
                    </button>
                    <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                </div>
            )}

            {(step === 'edit') && videoPreview && (
                <div className="w-full max-w-md aspect-[9/16] bg-black rounded-lg overflow-hidden relative shadow-2xl">
                    <video key={videoPreview} src={videoPreview} autoPlay muted loop className="w-full h-full object-cover" />
                </div>
            )}
            
            {step === 'publish' && videoPreview && (
                 <div className="flex flex-col items-center w-full max-w-md p-4 gap-4">
                    <div className="w-40 aspect-[9/16] bg-black rounded-lg overflow-hidden relative shadow-2xl flex-shrink-0">
                       <video key={videoPreview} src={videoPreview} autoPlay muted loop className="w-full h-full object-cover" />
                    </div>
                    <div className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3">
                        <div className="flex gap-2 items-center border-b border-slate-700 pb-2 mb-2">
                            <button onClick={cycleFont} className="p-2 bg-white/10 rounded-md font-semibold text-sm">{captionStyle.fontFamily}</button>
                            <button onClick={toggleBold} className={`p-2 rounded-md font-bold ${captionStyle.fontWeight === 'bold' ? 'bg-white text-black' : 'bg-white/10'}`}>B</button>
                            <button onClick={toggleItalic} className={`p-2 rounded-md italic ${captionStyle.fontStyle === 'italic' ? 'bg-white text-black' : 'bg-white/10'}`}>I</button>
                        </div>
                        <textarea 
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="Write a caption..."
                            rows={3}
                            className={`w-full bg-transparent rounded-lg p-1 focus:outline-none resize-none ${fontClass} ${fontWeightClass} ${fontStyleClass}`}
                        />
                    </div>
                    <button onClick={handlePublish} disabled={isPublishing} className="w-full bg-rose-600 hover:bg-rose-500 font-bold py-3 px-6 rounded-lg text-lg disabled:bg-slate-600">
                        {isPublishing ? 'Publishing...' : 'Publish Reel'}
                    </button>
                </div>
            )}

        </div>
    );
};

export default CreateReelScreen;