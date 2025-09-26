
import React, { useState } from 'react';
import { Post } from '../types';
import Icon from './Icon';

interface ShareModalProps {
  post: Post;
  onClose: () => void;
  onSetTtsMessage: (message: string) => void;
}

const SocialButton: React.FC<{ href: string; children: React.ReactNode; bgColor: string }> = ({ href, children, bgColor }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110 ${bgColor}`}
    >
        {children}
    </a>
);


const ShareModal: React.FC<ShareModalProps> = ({ post, onClose, onSetTtsMessage }) => {
    const [copyText, setCopyText] = useState('Copy');
    const postUrl = `${window.location.origin}${window.location.pathname}#/post/${post.id}`;
    
    const shareText = post.caption ? `Check out this post by ${post.author.name}: ${post.caption.substring(0, 100)}...` : `Check out this post by ${post.author.name} on VoiceBook!`;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    const handleCopy = () => {
        navigator.clipboard.writeText(postUrl).then(() => {
            setCopyText('Copied!');
            onSetTtsMessage('Link copied to clipboard!');
            setTimeout(() => setCopyText('Copy'), 2000);
        }).catch(() => {
            onSetTtsMessage('Failed to copy link.');
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-fast" 
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-gray-900 border border-green-500/20 rounded-xl shadow-2xl p-6 relative text-white" 
                onClick={e => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors" 
                    aria-label="Close share modal"
                >
                    <Icon name="close" className="w-6 h-6" />
                </button>
                
                <h2 className="text-2xl font-bold text-center mb-6 text-green-300">Share Post</h2>
                
                <p className="text-center text-gray-400 mb-6">Share this post via a link or on your favorite platforms.</p>

                <div className="flex justify-center gap-4 mb-8">
                    <SocialButton href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} bgColor="bg-blue-600">
                        <Icon name="facebook" className="w-7 h-7" />
                    </SocialButton>
                     <SocialButton href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} bgColor="bg-sky-500">
                        <Icon name="twitter" className="w-7 h-7" />
                    </SocialButton>
                     <SocialButton href={`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`} bgColor="bg-green-500">
                        <Icon name="whatsapp" className="w-7 h-7" />
                    </SocialButton>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Icon name="link" className="w-5 h-5 text-gray-400"/>
                    </div>
                    <input 
                        type="text"
                        readOnly
                        value={postUrl}
                        className="w-full bg-black border border-green-500/30 rounded-lg p-3 pl-10 text-gray-300"
                    />
                    <button 
                        onClick={handleCopy}
                        className={`absolute inset-y-0 right-0 m-1.5 px-4 rounded-md font-semibold transition-colors ${
                            copyText === 'Copied!' 
                                ? 'bg-green-500 text-black' 
                                : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                    >
                        {copyText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
