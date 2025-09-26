
import React, { useState, useEffect, useCallback } from 'react';
import { User, Post, Comment as CommentType, Report } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface AdminUserDetailsScreenProps {
  userId: string;
  onBack: () => void;
}

type Details = {
    user: User;
    posts: Post[];
    comments: CommentType[];
    reports: Report[];
}

type ActiveTab = 'posts' | 'comments' | 'reports';

const AdminUserDetailsScreen: React.FC<AdminUserDetailsScreenProps> = ({ userId, onBack }) => {
    const [details, setDetails] = useState<Details | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('posts');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await geminiService.getUserDetailsForAdmin(userId);
        setDetails(data);
        setIsLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (isLoading || !details) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <p className="text-slate-400 text-lg">Loading user activity log...</p>
            </div>
        );
    }
    
    const { user, posts, comments, reports } = details;

    const TabButton: React.FC<{ tabId: ActiveTab; label: string; count: number }> = ({ tabId, label, count }) => (
        <button 
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-3 font-semibold text-lg border-b-4 transition-colors ${activeTab === tabId ? 'border-rose-500 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
            {label} <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${activeTab === tabId ? 'bg-rose-500 text-white' : 'bg-slate-600 text-slate-200'}`}>{count}</span>
        </button>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'posts':
                return posts.length > 0 ? (
                    <div className="space-y-3">
                        {posts.map(post => (
                            <div key={post.id} className="bg-slate-800 p-3 rounded-md">
                                <p className="text-slate-300 italic">"{post.caption || "No caption"}"</p>
                                <p className="text-xs text-slate-500 mt-1">Posted on {new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-slate-400 text-center py-4">This user has not made any posts.</p>;
            case 'comments':
                return comments.length > 0 ? (
                     <div className="space-y-3">
                        {comments.map(comment => (
                            <div key={comment.id} className="bg-slate-800 p-3 rounded-md">
                                <p className="text-slate-300 italic">"{comment.text || `Audio Comment (${comment.duration}s)`}"</p>
                                <p className="text-xs text-slate-500 mt-1">Commented on post <span className="font-mono">{comment.postId.substring(0,6)}...</span></p>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-slate-400 text-center py-4">Could not find any recent comments by this user.</p>;
            case 'reports':
                return reports.length > 0 ? (
                     <div className="space-y-3">
                        {reports.map(report => (
                            <div key={report.id} className="bg-slate-800 p-3 rounded-md border-l-4 border-red-500/50">
                                <p className="text-slate-300">Reported for: <span className="font-semibold text-red-400">{report.reason}</span></p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Reported by <span className="font-semibold text-sky-400">{report.reporterName}</span> on {new Date(report.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-slate-400 text-center py-4">No reports found against this user.</p>;
        }
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
                    <Icon name="back" className="w-5 h-5"/>
                    <span>Back to User List</span>
                </button>

                <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-4">
                        <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full" />
                        <div>
                            <h1 className="text-3xl font-bold text-slate-100">{user.name}</h1>
                            <p className="text-slate-400">@{user.username}</p>
                        </div>
                    </div>
                    {/* Add action buttons here later if needed */}
                </div>
                
                <div className="mt-8">
                    <div className="border-b border-slate-700 flex items-center">
                        <TabButton tabId="posts" label="Recent Posts" count={posts.length} />
                        <TabButton tabId="comments" label="Recent Comments" count={comments.length} />
                        <TabButton tabId="reports" label="Reports Against User" count={reports.length} />
                    </div>
                    <div className="py-6">
                        {renderContent()}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminUserDetailsScreen;
