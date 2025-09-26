
import React, { useState, useEffect, useCallback } from 'react';
import { Report, Post, User, Comment } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

// A compact card to display the reported content for context
const ReportedContentCard: React.FC<{ report: Report }> = ({ report }) => {
    const [content, setContent] = useState<Post | User | Comment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            let fetchedContent: Post | User | Comment | null = null;
            if (report.reportedContentType === 'post') {
                fetchedContent = await geminiService.getPostById(report.reportedContentId);
            } else if (report.reportedContentType === 'user') {
                fetchedContent = await geminiService.getUserById(report.reportedContentId);
            }
            // In a real app, you might fetch comments differently
            // For now, we mainly show the user who was reported or who made the comment/post.
            if (!fetchedContent) {
                 fetchedContent = await geminiService.getUserById(report.reportedUserId);
            }
            setContent(fetchedContent);
            setIsLoading(false);
        };
        fetchContent();
    }, [report]);

    if (isLoading) return <div className="p-4 bg-slate-700/50 rounded-lg text-slate-400">Loading content...</div>;
    if (!content) return <div className="p-4 bg-slate-700/50 rounded-lg text-red-400">Content not found (may have been deleted).</div>;

    if ('bio' in content) { // It's a User object
        return (
            <div className="bg-slate-700/50 p-3 rounded-lg flex items-center gap-4">
                <img src={content.avatarUrl} alt={content.name} className="w-12 h-12 rounded-full"/>
                <div>
                    <p className="font-bold text-slate-100">{content.name} (@{content.username})</p>
                    <p className="text-sm text-slate-400">User profile was reported.</p>
                </div>
            </div>
        );
    }
    
    if ('caption' in content) { // It's a Post object
        return (
            <div className="bg-slate-700/50 p-3 rounded-lg">
                <p className="text-xs text-slate-400 font-semibold">Reported Post by {content.author.name}</p>
                <p className="text-slate-200 mt-1 italic">"{content.caption}"</p>
            </div>
        );
    }

    return null;
};

const AdminReportsScreen: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        const pendingReports = await geminiService.getPendingReports();
        setReports(pendingReports);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleAction = async (reportId: string, resolution: string, actionFn?: () => Promise<any>) => {
        if (actionFn) {
            const success = await actionFn();
            if (!success) {
                alert(`Action "${resolution}" failed. Please try again.`);
                return;
            }
        }
        await geminiService.resolveReport(reportId, resolution);
        fetchReports(); // Refresh the list
    };
    
    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading pending reports...</p>;
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">User Reports</h1>
                <p className="text-slate-400 mb-8">Review and take action on content reported by users.</p>

                 {reports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg">
                        <Icon name="bell" className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">All Clear!</h3>
                        <p className="text-slate-400 mt-2">There are no pending user reports.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reports.map(report => (
                            <div key={report.id} className="bg-slate-800/50 rounded-lg p-5 border border-slate-700 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-100">Report #{report.id.substring(0,6)}</h3>
                                        <p className="text-sm text-slate-400">
                                            Reported by <span className="font-semibold text-sky-400">{report.reporterName}</span> on {new Date(report.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                         <p className="text-sm font-bold text-rose-400">Reason</p>
                                         <p className="text-sm text-slate-300">{report.reason}</p>
                                    </div>
                                </div>
                                <ReportedContentCard report={report} />
                                <div className="pt-4 border-t border-slate-700 flex flex-wrap gap-3">
                                    <button onClick={() => handleAction(report.id, 'Dismissed')} className="px-3 py-2 text-sm rounded-md bg-slate-600 hover:bg-slate-500 text-white font-semibold">Dismiss Report</button>
                                    
                                    {report.reportedContentType === 'post' && 
                                        <button onClick={() => handleAction(report.id, 'Content Deleted', () => geminiService.deletePostAsAdmin(report.reportedContentId))} className="px-3 py-2 text-sm rounded-md bg-yellow-600 hover:bg-yellow-500 text-white font-semibold">Delete Post</button>
                                    }
                                    {report.reportedContentType === 'comment' && 
                                        <button onClick={() => handleAction(report.id, 'Content Deleted', () => geminiService.deleteCommentAsAdmin(report.reportedContentId, report.reportedContentId))} className="px-3 py-2 text-sm rounded-md bg-yellow-600 hover:bg-yellow-500 text-white font-semibold">Delete Comment</button>
                                    }
                                    
                                    <button onClick={() => handleAction(report.id, 'User Suspended (7d)', () => geminiService.suspendUserCommenting(report.reportedUserId, 7))} className="px-3 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold">Suspend User (7d)</button>
                                    <button onClick={() => handleAction(report.id, 'User Banned', () => geminiService.banUser(report.reportedUserId))} className="px-3 py-2 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white font-bold">Ban User</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReportsScreen;
