
import React, { useState } from 'react';
import { User } from './types';
import AdminSidebar from './components/AdminSidebar';
import AdminPanelScreen from './components/AdminPanelScreen';
import UserManagementScreen from './components/UserManagementScreen';

interface AdminAppProps {
    currentUser: User;
    onSwitchToUserView: () => void;
}

type AdminView = 'campaigns' | 'users';

const AdminApp: React.FC<AdminAppProps> = ({ currentUser, onSwitchToUserView }) => {
    const [activeView, setActiveView] = useState<AdminView>('campaigns');
    const [ttsMessage, setTtsMessage] = useState(''); // Admin panel might not use TTS, but good to have

    const renderView = () => {
        switch (activeView) {
            case 'campaigns':
                return <AdminPanelScreen currentUser={currentUser} onSetTtsMessage={setTtsMessage} lastCommand={null} />;
            case 'users':
                return <UserManagementScreen currentUser={currentUser} />;
            default:
                return <div>Select a view</div>;
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-900 flex font-sans text-white">
            <AdminSidebar 
                activeView={activeView}
                onNavigate={setActiveView}
                onSwitchToUserView={onSwitchToUserView}
            />
            <main className="flex-grow overflow-hidden relative">
                <div className="h-full w-full absolute inset-0">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default AdminApp;
