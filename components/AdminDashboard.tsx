import React, { useState, useEffect } from 'react';
import { AdminUser, User } from '../types';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import AdminUserManagementScreen from './AdminUserManagementScreen';
import AdminContentModerationScreen from './AdminContentModerationScreen';
import AdminCampaignApprovalScreen from './AdminCampaignApprovalScreen';
import AdminReportsScreen from './AdminReportsScreen';
import AdminUserDetailsScreen from './AdminUserDetailsScreen';
import AdminAnnouncementScreen from './AdminAnnouncementScreen';
import AdminTransactionsScreen from './AdminTransactionsScreen';
import Icon from './Icon';
import { geminiService } from '../services/geminiService';

interface AdminDashboardProps {
    adminUser: AdminUser;
    onLogout: () => void;
}

type AdminView = 'dashboard' | 'users' | 'content' | 'campaigns' | 'reports' | 'announcements' | 'transactions';

interface DashboardStats {
    totalUsers: number;
    newUsersToday: number;
    postsLast24h: number;
    pendingCampaigns: number;
    activeUsersNow: number;
    pendingReports: number;
    pendingPayments: number;
}

const StatCard: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-slate-800 p-6 rounded-lg flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon name={icon} className="w-8 h-8 text-white"/>
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-slate-400">{title}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; title: string; count: number; color: string; onClick: () => void }> = ({ icon, title, count, color, onClick }) => (
    <button onClick={onClick} className="bg-slate-800 p-6 rounded-lg text-left w-full hover:bg-slate-700/50 transition-colors">
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-full ${color}`}>
                <Icon name={icon} className="w-8 h-8 text-white"/>
            </div>
            <p className="text-4xl font-bold text-white">{count}</p>
        </div>
        <h3 className="text-xl font-bold text-slate-100 mt-4">{title}</h3>
    </button>
);


const DashboardComponent: React.FC<{ onNavigate: (view: AdminView) => void }> = ({ onNavigate }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = () => {
            geminiService.getAdminDashboardStats().then(data => {
                setStats(data as DashboardStats);
                setIsLoading(false);
            });
        };
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // Refresh stats every minute
        return () => clearInterval(interval);
    }, []);

    if (isLoading || !stats) {
        return <div className="p-8 text-slate-400">Loading dashboard statistics...</div>;
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
            <p className="text-slate-400 mt-1">An overview of your platform's activity.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <StatCard icon="users" title="Total Users" value={stats.totalUsers.toLocaleString()} color="bg-sky-500" />
                <StatCard icon="add-friend" title="New Users (24h)" value={stats.newUsersToday.toLocaleString()} color="bg-green-500" />
                <StatCard icon="users-group-solid" title="Active Users Now" value={`${stats.activeUsersNow.toLocaleString()}`} color="bg-emerald-500" />
                <StatCard icon="edit" title="New Posts (24h)" value={stats.postsLast24h.toLocaleString()} color="bg-indigo-500" />
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold text-slate-100">Action Items</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    <ActionCard 
                        icon="briefcase" 
                        title="Pending Campaigns" 
                        count={stats.pendingCampaigns} 
                        color="bg-yellow-500" 
                        onClick={() => onNavigate('campaigns')}
                    />
                     <ActionCard 
                        icon="coin" 
                        title="Pending Transactions" 
                        count={stats.pendingPayments} 
                        color="bg-orange-500" 
                        onClick={() => onNavigate('transactions')}
                    />
                    <ActionCard 
                        icon="bell" 
                        title="User Reports" 
                        count={stats.pendingReports} 
                        color="bg-rose-500" 
                        onClick={() => onNavigate('reports')}
                    />
                </div>
            </div>
        </div>
    );
}


const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminUser, onLogout }) => {
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);

    const renderView = () => {
        if (viewingUserId) {
            return <AdminUserDetailsScreen userId={viewingUserId} onBack={() => setViewingUserId(null)} />;
        }

        switch (activeView) {
            case 'users':
                return <AdminUserManagementScreen onSelectUser={(user) => setViewingUserId(user.id)} />;
            case 'content':
                return <AdminContentModerationScreen />;
            case 'campaigns':
                return <AdminCampaignApprovalScreen />;
            case 'reports':
                return <AdminReportsScreen />;
            case 'announcements':
                return <AdminAnnouncementScreen />;
            case 'transactions':
                return <AdminTransactionsScreen adminUser={adminUser} />;
            case 'dashboard':
            default:
                return <DashboardComponent onNavigate={setActiveView} />;
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-900 flex flex-col md:flex-row font-sans text-white">
            <AdminDashboardSidebar 
                adminUser={adminUser}
                activeView={activeView}
                onNavigate={(view) => {
                    setViewingUserId(null); // When changing main view, clear user detail view
                    setActiveView(view);
                }}
                onLogout={onLogout}
            />
            <main className="flex-grow overflow-hidden relative">
                <div className="h-full w-full absolute inset-0">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;