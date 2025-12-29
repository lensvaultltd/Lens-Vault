import React, { useState, useEffect } from 'react';
import { User, Shield, Check, X, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface AdminUser {
    id: string;
    email: string;
    created_at: string;
}

export const ManageAdmins: React.FC = () => {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newAdminEmail, setNewAdminEmail] = useState('');

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('../../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/admins', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setAdmins(data);
            }
        } catch (error) {
            console.error('Failed to fetch admins', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        const init = async () => {
            try {
                const { supabase } = await import('../../lib/supabase');
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (session?.user) fetchAdmins();
                    else setLoading(false);
                });
                unsubscribe = () => subscription.unsubscribe();
            } catch (e) { setLoading(false); }
        };
        init();
        return () => { if (unsubscribe) unsubscribe(); };
    }, []);

    const handleGrant = async () => {
        if (!newAdminEmail) return;
        try {
            const { supabase } = await import('../../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/admins/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: newAdminEmail })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setNewAdminEmail('');
            alert('Success: Admin access granted.');
            fetchAdmins();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleRevoke = async (email: string) => {
        if (!confirm(`Are you sure you want to remove admin access from ${email}?`)) return;
        try {
            const { supabase } = await import('../../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/admins/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert('Success: Admin access revoked.');
            fetchAdmins();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="p-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" /> Add New Admin
                </h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm text-gray-400 mb-1">User Email (must be existing user)</label>
                        <input
                            type="email"
                            placeholder="user@example.com"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                        />
                    </div>
                    <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={handleGrant}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Grant Access
                    </Button>
                </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Current Administrators</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Admin User</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {admins.map(admin => (
                                <tr key={admin.id} className="hover:bg-gray-700/50">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold">
                                            {admin.email[0].toUpperCase()}
                                        </div>
                                        <span className="text-white font-medium">{admin.email}</span>
                                        {admin.email.toLowerCase() === 'lensvault@proton.me' && (
                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 ml-2">Super Admin</Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {admin.email.toLowerCase() !== 'lensvault@proton.me' && (
                                            <Button
                                                size="sm" variant="ghost"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                onClick={() => handleRevoke(admin.email)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
