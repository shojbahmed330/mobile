



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { geminiService } from '../services/geminiService';
import ImageCropper from './ImageCropper';

interface AdminUserManagementScreenProps {
  onSelectUser: (user: User) => void;
}

const AdminUserManagementScreen: React.FC<AdminUserManagementScreenProps> = ({ onSelectUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [imageForCropper, setImageForCropper] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const allUsers = await geminiService.getAllUsersForAdmin();
        setUsers(allUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBanToggle = async (user: User) => {
        const action = user.isBanned ? 'unban' : 'ban';
        if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            const success = user.isBanned ? await geminiService.unbanUser(user.id) : await geminiService.banUser(user.id);
            if (success) fetchUsers();
        }
    };
    
    const handleCommentSuspensionToggle = async (user: User) => {
        const isSuspended = user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date();
        const action = isSuspended ? 'lift the comment suspension for' : 'suspend commenting for 1 day for';
        if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            const success = isSuspended ? await geminiService.liftUserCommentingSuspension(user.id) : await geminiService.suspendUserCommenting(user.id, 1);
             if (success) fetchUsers();
        }
    };
    
    const handlePostSuspensionToggle = async (user: User) => {
        const isSuspended = user.postingSuspendedUntil && new Date(user.postingSuspendedUntil) > new Date();
        const action = isSuspended ? 'lift the posting suspension for' : 'suspend posting for 7 days for';
        if (window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            const success = isSuspended 
                ? await geminiService.liftUserPostingSuspension(user.id) 
                : await geminiService.suspendUserPosting(user.id, 7);
             if (success) fetchUsers();
        }
    };
    
    const handleWarnUser = async (user: User) => {
        const reason = prompt(`Enter the warning message for ${user.name}:`);
        if (reason && reason.trim()) {
            const success = await geminiService.warnUser(user.id, reason.trim());
            if (success) {
                alert('Warning sent successfully. The user will see it in their notifications.');
            } else {
                alert('Failed to send warning.');
            }
        }
    };

    const handleReactivate = async (user: User) => {
        if (window.confirm(`Are you sure you want to reactivate ${user.name}'s account?`)) {
            const success = await geminiService.reactivateUserAsAdmin(user.id);
            if (success) fetchUsers();
        }
    };

    const handlePhotoChangeClick = (user: User) => {
        setUserToEdit(user);
        fileInputRef.current?.click();
    };
    
    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && userToEdit) {
            setImageForCropper(URL.createObjectURL(file));
        }
        e.target.value = ''; // Reset input
    };

    const handleSaveCrop = async (base64: string) => {
        if (!userToEdit) return;
        setIsUploading(true);
        const updatedUser = await geminiService.adminUpdateUserProfilePicture(userToEdit.id, base64);
        setIsUploading(false);
        if (updatedUser) {
            setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
        closeCropper();
    };

    const closeCropper = () => {
        if (imageForCropper) {
            URL.revokeObjectURL(imageForCropper);
        }
        setUserToEdit(null);
        setImageForCropper(null);
    };
    
    const UserStatusBadge = ({ user }: { user: User }) => {
        if (user.isDeactivated) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400">Deactivated</span>;
        }
        if (user.isBanned) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">Banned</span>;
        }
        if (user.postingSuspendedUntil && new Date(user.postingSuspendedUntil) > new Date()) {
            const date = new Date(user.postingSuspendedUntil);
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-400" title={`Posting suspended until ${date.toLocaleString()}`}>Post Suspended</span>;
        }
        if (user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date()) {
            const date = new Date(user.commentingSuspendedUntil);
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400" title={`Commenting suspended until ${date.toLocaleString()}`}>Comment Suspended</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">Active</span>;
    };


    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading users...</p>;
    }
    
    return (
        <>
            <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2 text-slate-100">User Management</h1>
                    <p className="text-slate-400 mb-8">Click on a user to see their activity log. Apply quick actions here.</p>
                    
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
                    
                    <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Quick Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                                    {users.map(user => {
                                        const isCommentSuspended = user.commentingSuspendedUntil && new Date(user.commentingSuspendedUntil) > new Date();
                                        const isPostSuspended = user.postingSuspendedUntil && new Date(user.postingSuspendedUntil) > new Date();

                                        return (
                                            <tr key={user.id} onClick={() => onSelectUser(user)} className="cursor-pointer hover:bg-slate-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-slate-100">{user.name}</div>
                                                            <div className="text-sm text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <UserStatusBadge user={user} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {user.isDeactivated ? (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleReactivate(user); }}
                                                                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-sky-600 hover:bg-sky-500 text-white"
                                                            >
                                                                Reactivate
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); handleWarnUser(user); }} className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-sky-600 hover:bg-sky-500 text-white">Warn</button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleCommentSuspensionToggle(user); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isCommentSuspended ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-600 hover:bg-yellow-500'} text-white`}>
                                                                    {isCommentSuspended ? 'Lift Comment Ban' : 'Suspend Comments (1d)'}
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handlePostSuspensionToggle(user); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isPostSuspended ? 'bg-green-600 hover:bg-green-500' : 'bg-orange-600 hover:bg-orange-500'} text-white`}>
                                                                    {isPostSuspended ? 'Lift Post Ban' : 'Suspend Posting (7d)'}
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleBanToggle(user); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${user.isBanned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white`}>
                                                                    {user.isBanned ? 'Unban' : 'Ban'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
             {imageForCropper && userToEdit && (
                <ImageCropper
                    imageUrl={imageForCropper}
                    aspectRatio={1}
                    onSave={handleSaveCrop}
                    onCancel={closeCropper}
                    isUploading={isUploading}
                />
            )}
        </>
    );
};

export default AdminUserManagementScreen;