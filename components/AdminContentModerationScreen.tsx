
import React, { useState, useEffect, useCallback } from 'react';
import { Post, Comment } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

const AdminContentModerationScreen: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        const allPosts = await geminiService.getAllPostsForAdmin();
        // Sort by most recent first
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(allPosts);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleDeletePost = async (postId: string) => {
        if (window.confirm("Are you sure you want to permanently delete this post? This action cannot be undone.")) {
            const success = await geminiService.deletePostAsAdmin(postId);
            if (success) {
                fetchContent(); // Refresh content
            } else {
                alert("Failed to delete post.");
            }
        }
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
         if (window.confirm("Are you sure you want to permanently delete this comment?")) {
            const success = await geminiService.deleteCommentAsAdmin(commentId, postId);
            if (success) {
                fetchContent(); // Refresh content
            } else {
                alert("Failed to delete comment.");
            }
        }
    };

    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading content...</p>;
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">Content Moderation</h1>
                <p className="text-slate-400 mb-8">Review and remove user-generated posts and comments.</p>

                <div className="space-y-8">
                    {posts.length > 0 ? posts.map(post => (
                        <div key={post.id} className="bg-slate-800/50 rounded-lg border border-slate-700">
                            {/* Post Section */}
                            <div className="p-4 flex gap-4 items-start border-b border-slate-700">
                                <img src={post.author.avatarUrl} alt={post.author.name} className="w-12 h-12 rounded-full flex-shrink-0"/>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-200">{post.author.name}</p>
                                        <p className="text-xs text-slate-400 font-mono">({post.author.id})</p>
                                    </div>
                                    <p className="text-slate-300 mt-1">{post.caption}</p>
                                     {post.imageUrl && <img src={post.imageUrl} alt="Post image" className="mt-2 rounded-md max-h-48"/>}
                                </div>
                                <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Icon name="trash" className="w-4 h-4"/>
                                    <span>Delete Post</span>
                                </button>
                            </div>
                            {/* Comments Section */}
                            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                                {post.comments.length > 0 ? post.comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 items-start bg-slate-700/50 p-2 rounded-md">
                                        <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm text-slate-200">{comment.author.name}</p>
                                                <p className="text-xs text-slate-500 font-mono">({comment.author.id})</p>
                                            </div>
                                            <p className="text-sm text-slate-400">Audio Comment ({comment.duration}s)</p>
                                        </div>
                                         <button
                                            onClick={() => handleDeleteComment(comment.id, post.id)}
                                            className="bg-slate-600 hover:bg-red-600 text-white font-bold p-1.5 rounded-md transition-colors"
                                            title="Delete Comment"
                                        >
                                            <Icon name="trash" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500 text-center">No comments on this post.</p>
                                )}
                            </div>
                        </div>
                    )) : (
                         <div className="text-center py-12 bg-slate-800/50 rounded-lg">
                            <Icon name="logo" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                            <h3 className="text-xl font-bold text-slate-300">No Content Yet</h3>
                            <p className="text-slate-400 mt-2">There are no posts on the platform.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminContentModerationScreen;
