import React, { useState } from 'react';
import { Shield, Users, AlertTriangle, LogOut, ArrowLeft, LayoutDashboard, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { UserManagement } from './UserManagement';
import { EmergencyAccess } from '../Sharing/EmergencyAccess';
import { ManageAdmins } from './ManageAdmins';

interface AdminDashboardLayoutProps {
    userEmail: string;
    onLogout: () => void;
    onSwitchDataView: () => void;
}

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({ userEmail, onLogout, onSwitchDataView }) => {
    const [activeSection, setActiveSection] = useState<'users' | 'emergency' | 'admins'>('users');

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-8 px-2 text-blue-400">
                    <Shield className="w-6 h-6" />
                    <h1 className="text-xl font-bold">Admin Portal</h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <Button
                        variant={activeSection === 'users' ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveSection('users')}
                    >
                        <Users className="w-4 h-4" /> User Management
                    </Button>
                    <Button
                        variant={activeSection === 'emergency' ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveSection('emergency')}
                    >
                        <AlertTriangle className="w-4 h-4" /> Emergency Requests
                    </Button>
                    <Button
                        variant={activeSection === 'admins' ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3"
                        onClick={() => setActiveSection('admins')}
                    >
                        <Shield className="w-4 h-4" /> Manage Admins
                    </Button>
                </nav>

                <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
                    <div className="px-2 py-2 text-xs text-slate-500">
                        Logged in as <br /> {userEmail}
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:bg-slate-800" onClick={onSwitchDataView}>
                        <LayoutDashboard className="w-4 h-4" /> View My Vault
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={onLogout}>
                        <LogOut className="w-4 h-4" /> Logout
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <header className="border-b border-slate-800 bg-slate-900/50 p-6">
                    <h2 className="text-2xl font-semibold">
                        {activeSection === 'users' && 'User Management'}
                        {activeSection === 'emergency' && 'Emergency Access Review'}
                        {activeSection === 'admins' && 'Manage Administrators'}
                    </h2>
                </header>
                <main className="p-6">
                    {activeSection === 'users' && <UserManagement />}
                    {activeSection === 'emergency' && <EmergencyAccess userEmail={userEmail} isAdmin={true} />}
                    {activeSection === 'admins' && <ManageAdmins />}
                </main>
            </div>
        </div>
    );
};
