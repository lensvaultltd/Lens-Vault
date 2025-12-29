import React, { useState, useEffect } from 'react';
import { User, Shield, Check, X, Search, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface SystemUser {
    id: string;
    email: string;
    subscription_plan: string | null;
    created_at: string;
    last_sign_in_at: string | null;
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('../../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`http://localhost:3001/api/admin/users?t=${Date.now()}`, { // Anti-cache param
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
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
                    if (session?.user) {
                        fetchUsers();
                    } else {
                        setLoading(false);
                    }
                });

                unsubscribe = () => subscription.unsubscribe();
            } catch (error) {
                console.error("Auth init error", error);
                setLoading(false);
            }
        };

        init();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const handleUpdateSubscription = async (email: string, plan: string) => {
        try {
            // Optimistic Update
            setUsers(prev => prev.map(u => u.email === email ? { ...u, subscription_plan: plan } : u));

            const { supabase } = await import('../../lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`http://localhost:3001/api/admin/users/${email}/subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`Failed: ${err.error || 'User not found or error occurred'}`);
                // Revert on failure
                fetchUsers();
                return;
            }

            // Still fetch to be sure
            await fetchUsers();
            alert(`Success! User ${email} is now on ${plan} plan.`);

        } catch (error) {
            console.error('Failed to update subscription', error);
            alert('Failed to update subscription');
            // Revert on failure
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" /> Manual Plan Allocation
                </h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm text-gray-400 mb-1">User Email</label>
                        <input
                            type="email"
                            placeholder="user@example.com"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            id="manual-email"
                        />
                    </div>
                    <div className="w-48">
                        <label className="block text-sm text-gray-400 mb-1">Plan</label>
                        <select
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            id="manual-plan"
                            defaultValue="premium"
                        >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="family">Family</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                    <Button
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                            const emailInput = document.getElementById('manual-email') as HTMLInputElement;
                            const planInput = document.getElementById('manual-plan') as HTMLSelectElement;
                            if (emailInput.value) {
                                handleUpdateSubscription(emailInput.value, planInput.value);
                                emailInput.value = ''; // clear
                            }
                        }}
                    >
                        Update Plan
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6" /> User Management
                </h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading users...</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Joined</th>
                                <th className="p-4 font-medium">Plan</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                {user.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{user.email}</p>
                                                <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Active</Badge>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${user.subscription_plan === 'premium' ? 'bg-amber-500/10 text-amber-500' :
                                            user.subscription_plan === 'business' ? 'bg-purple-500/10 text-purple-500' :
                                                'bg-gray-700 text-gray-300'
                                            }`}>
                                            {user.subscription_plan || 'Free'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {user.subscription_plan !== 'premium' ? (
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                                                    onClick={() => handleUpdateSubscription(user.email, 'premium')}
                                                >
                                                    Grant Premium
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-gray-600 text-gray-400 hover:bg-gray-800"
                                                    onClick={() => handleUpdateSubscription(user.email, 'free')}
                                                >
                                                    Revoke Premium
                                                </Button>
                                            )}
                                        </div>
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
