

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';

interface UserManagementScreenProps {
  currentUser: User;
}

const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        const allUsers = await geminiService.getAllUsersForAdmin();
        setUsers(allUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (targetUser: User, newRole: 'admin' | 'user') => {
        const success = await geminiService.updateUserRole(targetUser.id, newRole);
        if (success) {
            // Refresh the list to show the change
            setUsers(currentUsers => currentUsers.map(u => 
                u.id === targetUser.id ? { ...u, role: newRole } : u
            ));
        } else {
            alert("Failed to update user role.");
        }
    };

    if (isLoading) {
        return <p className="p-8 text-slate-400">Loading users...</p>;
    }
    
    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-slate-100">User Management</h1>
                <p className="text-slate-400 mb-8">Assign or revoke admin privileges for users.</p>
                
                <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                    <div className="flex flex-col">
                        {users.map((user, index) => (
                            <div key={user.id} className={`flex flex-col sm:flex-row items-center justify-between p-4 gap-4 ${index < users.length - 1 ? 'border-b border-slate-700' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full"/>
                                    <div>
                                        <p className="font-bold text-slate-100 text-lg">{user.name}</p>
                                        <p className="text-sm text-slate-400">{user.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${user.role === 'admin' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-600/50 text-slate-300'}`}>
                                        {user.role}
                                    </span>
                                    {user.role === 'user' ? (
                                        <button onClick={() => handleRoleChange(user, 'admin')} className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                            Make Admin
                                        </button>
                                    ) : (
                                        <button onClick={() => handleRoleChange(user, 'user')} className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                            Make User
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default UserManagementScreen;