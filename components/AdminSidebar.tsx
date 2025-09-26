
import React from 'react';
import Icon from './Icon';

interface AdminSidebarProps {
  activeView: 'campaigns' | 'users';
  onNavigate: (view: 'campaigns' | 'users') => void;
  onSwitchToUserView: () => void;
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
                    ? 'bg-sky-500/10 text-sky-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
            }`}
        >
            <Icon name={iconName} className="w-7 h-7" />
            <span>{label}</span>
        </button>
    </li>
);

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, onNavigate, onSwitchToUserView }) => {
  return (
    <aside className="w-72 bg-slate-800/80 border-r border-slate-700/50 p-4 flex flex-col flex-shrink-0">
      <div className="flex-grow">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100">Admin Area</h2>
            <p className="text-sm text-slate-400">System Management</p>
        </div>
        <nav>
          <ul className="space-y-2">
            <NavItem
                iconName="briefcase"
                label="Campaigns"
                isActive={activeView === 'campaigns'}
                onClick={() => onNavigate('campaigns')}
            />
            <NavItem
                iconName="users"
                label="Users"
                isActive={activeView === 'users'}
                onClick={() => onNavigate('users')}
            />
          </ul>
        </nav>
      </div>

      <div className="flex-shrink-0">
        <button
          onClick={onSwitchToUserView}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span>Switch to User View</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
