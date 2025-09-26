import React from 'react';
import Icon from './Icon';
import { AdminUser } from '../types';

type AdminView = 'dashboard' | 'users' | 'content' | 'campaigns' | 'reports' | 'announcements' | 'transactions';

interface AdminDashboardSidebarProps {
  adminUser: AdminUser;
  activeView: AdminView;
  onNavigate: (view: AdminView) => void;
  onLogout: () => void;
}

const NavItem: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ iconName, label, isActive, onClick }) => (
    <li>
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg transition-colors ${
                isActive
                    ? 'bg-sky-500/20 text-sky-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
            }`}
        >
            <Icon name={iconName} className="w-7 h-7" />
            <span>{label}</span>
        </button>
    </li>
);

const AdminDashboardSidebar: React.FC<AdminDashboardSidebarProps> = ({ adminUser, activeView, onNavigate, onLogout }) => {
  return (
    <aside className="w-full md:w-72 bg-slate-800/80 border-r border-slate-700/50 p-4 flex flex-col flex-shrink-0">
      <div className="flex-grow">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Admin Portal</h2>
            <p className="text-sm text-sky-400 truncate" title={adminUser.email}>{adminUser.email}</p>
        </div>
        <nav>
          <ul className="space-y-2">
             <NavItem
                iconName="home"
                label="Dashboard"
                isActive={activeView === 'dashboard'}
                onClick={() => onNavigate('dashboard')}
            />
             <NavItem
                iconName="bell"
                label="Reports"
                isActive={activeView === 'reports'}
                onClick={() => onNavigate('reports')}
            />
            <NavItem
                iconName="users"
                label="Users"
                isActive={activeView === 'users'}
                onClick={() => onNavigate('users')}
            />
             <NavItem
                iconName="trash"
                label="Content"
                isActive={activeView === 'content'}
                onClick={() => onNavigate('content')}
            />
            <NavItem
                iconName="briefcase"
                label="Campaigns"
                isActive={activeView === 'campaigns'}
                onClick={() => onNavigate('campaigns')}
            />
             <NavItem
                iconName="coin"
                label="Transactions"
                isActive={activeView === 'transactions'}
                onClick={() => onNavigate('transactions')}
            />
             <NavItem
                iconName="speaker-wave"
                label="Announcements"
                isActive={activeView === 'announcements'}
                onClick={() => onNavigate('announcements')}
            />
          </ul>
        </nav>
      </div>

      <div className="flex-shrink-0">
        <a href="/#/" className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-lg py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-2">
            <Icon name="home" className="w-6 h-6" />
            <span>Go to Main Site</span>
        </a>
        <button
          onClick={onLogout}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminDashboardSidebar;