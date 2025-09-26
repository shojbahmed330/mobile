
import React, { useState } from 'react';
import { AdminUser } from '../types';
import AdminDashboard from './AdminDashboard';
import AdminLoginScreen from './AdminLoginScreen';

const AdminPortal: React.FC = () => {
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

    const handleLoginSuccess = (user: AdminUser) => {
        setAdminUser(user);
    };

    const handleLogout = () => {
        setAdminUser(null);
    };

    if (!adminUser) {
        return <AdminLoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    return <AdminDashboard adminUser={adminUser} onLogout={handleLogout} />;
};

export default AdminPortal;
