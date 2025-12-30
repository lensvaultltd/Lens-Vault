import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileText, Check, X, Shield, Settings, HeartPulse, User } from 'lucide-react';
import { EmergencyRequest, DigitalWillConfig } from '../../types';
import { familySharingService } from '../../services/familySharingService';
import { toast } from '../ui/use-toast';

interface EmergencyAccessProps {
    userEmail: string;
    isAdmin?: boolean;
}

export const EmergencyAccess: React.FC<EmergencyAccessProps> = ({ userEmail, isAdmin = false }) => {
    const [activeTab, setActiveTab] = useState<'config' | 'request' | 'admin'>('config');
    const [loading, setLoading] = useState(false);

    // --- CONFIG STATE ---
    const [willConfig, setWillConfig] = useState<DigitalWillConfig>({
        userId: '',
        condition: 'death',
        action: 'transfer_access',
        beneficiaryEmail: '',
        updatedAt: new Date()
    });

    // --- REQUEST STATE ---
    const [targetEmail, setTargetEmail] = useState('');
    const [requestType, setRequestType] = useState('death');
    const [customRequestReason, setCustomRequestReason] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // --- ADMIN STATE ---
    const [adminRequests, setAdminRequests] = useState<EmergencyRequest[]>([]);

    useEffect(() => {
        // Load config
        if (activeTab === 'config') {
            fetch(`/api/share/will/config?email=${userEmail}`)
                .then(res => res.json())
                .then(data => { if (data) setWillConfig(data); })
                .catch(err => console.error(err));
        }
        // Load admin requests
        if (activeTab === 'admin' && isAdmin) {
            const token = localStorage.getItem('token'); // Assuming we store token. If not, we might need to get it from context or props.
            // Using fetch wrapper or just fetch with headers if we had the token. 
            // Since we don't have the token easily here without `useAuth` or similar, 
            // we will assume valid session cookies or handle it if we can access apiService. 
            // Wait, App.tsx uses apiService. Let's assume we can use relative paths and cookies/auth header is handled or we need to pass token.
            // The verifyToken middleware expects 'Authorization: Bearer <token>'.
            // I should double check how other components fetch. apiService handles it?
            // apiService uses `axios` or similar? Let's check apiService.
            // For now, I'll use fetch but I need the token.
            // Let's assume for now the user is authenticated via Supabase.
            // I'll try to get the token from `auth.currentUser`.

            import('../../lib/supabase').then(({ supabase }) => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    const token = session?.access_token;
                    if (token) {
                        fetch('/api/share/emergency/admin/requests', { // Fixed URL and route
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                            .then(res => res.json())
                            .then(data => setAdminRequests(Array.isArray(data) ? data : []))
                            .catch(err => console.error(err));
                    }
                });
            });
        }
    }, [activeTab, userEmail, isAdmin]);

    const handleConfigSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await familySharingService.createDigitalWill({
                sender_email: userEmail,
                beneficiary_email: willConfig.beneficiaryEmail || '',
                encrypted_vault_data: JSON.stringify(willConfig),
                condition: willConfig.condition as any,
                custom_condition: (willConfig as any).customCondition,
                action: willConfig.action as any
            });

            if (result.success) {
                toast({ variant: 'success', title: 'Digital Will saved successfully' });
            } else {
                toast({ variant: 'destructive', title: 'Failed to save', description: result.message });
            }
        } catch (error) {
            console.error('Save will error:', error);
            toast({ variant: 'destructive', title: 'Error saving Digital Will' });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return alert('Proof document required');
        setLoading(true);

        try {
            const { supabase } = await import('../../lib/supabase');
            // Upload to Supabase Storage
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Storage Error:', uploadError);
                throw new Error(`Document upload failed: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);

            const result = await familySharingService.createEmergencyRequest({
                requester_email: userEmail,
                target_user_email: targetEmail,
                proof_document_url: publicUrl,
                request_type: requestType as any,
                custom_reason: requestType === 'other' ? customRequestReason : undefined
            });

            setLoading(false);
            if (result.success) {
                toast({ variant: 'success', title: 'Emergency request submitted', description: 'Admin will review your request' });
                setTargetEmail('');
                setFile(null);
                setCustomRequestReason('');
            } else {
                toast({ variant: 'destructive', title: 'Failed to submit request', description: result.message });
            }
        } catch (err: any) {
            setLoading(false);
            console.error(err);
            alert(err.message || 'An error occurred');
        }
    };

    const handleAdminApprove = async (reqId: string, action: string) => {
        try {
            const result = action === 'reject'
                ? await familySharingService.rejectEmergencyRequest(reqId, 'Rejected by admin')
                : await familySharingService.approveEmergencyRequest(reqId, 'Approved by admin');

            if (result.success) {
                toast({ variant: 'success', title: 'Request processed' });
                setAdminRequests(prev => prev.filter(r => r.id !== reqId));
            } else {
                toast({ variant: 'destructive', title: 'Failed to process request', description: result.message });
            }
        } catch (error) {
            console.error('Admin approve error:', error);
            toast({ variant: 'destructive', title: 'Error processing request' });
        }
    };

    // Realtime Subscription
    useEffect(() => {
        if (activeTab === 'admin' && isAdmin) {
            import('../../lib/supabase').then(({ supabase }) => {
                const channel = supabase.channel('emergency_requests_admin')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_requests' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            setAdminRequests(prev => [payload.new as EmergencyRequest, ...prev]);
                        } else if (payload.eventType === 'UPDATE') {
                            setAdminRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as EmergencyRequest : r));
                        }
                    })
                    .subscribe();
                return () => { supabase.removeChannel(channel); };
            });
        }
    }, [activeTab, isAdmin]);

    return (
        <div className="p-6 text-white max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <HeartPulse className="text-red-500 w-8 h-8" />
                <h1 className="text-3xl font-bold">Emergency Access & Digital Will</h1>
            </div>

            <div className="flex gap-4 border-b border-gray-700 mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'config' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-400'}`}
                >
                    <Settings className="inline w-4 h-4 mr-2" /> My Will Settings
                </button>
                <button
                    onClick={() => setActiveTab('request')}
                    className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'request' ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-400'}`}
                >
                    <AlertTriangle className="inline w-4 h-4 mr-2" /> Request Access
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`pb-2 px-4 whitespace-nowrap ${activeTab === 'admin' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
                    >
                        <Shield className="inline w-4 h-4 mr-2" /> Admin Review
                    </button>
                )}
            </div>

            {/* --- CONFIG TAB --- */}
            {activeTab === 'config' && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Configure Your Digital Will</h2>
                    <p className="text-gray-400 mb-6">
                        Decide what happens to your vault if you are unable to access it (Death, Illness, or Absence).
                    </p>
                    <form onSubmit={handleConfigSave} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-gray-300 mb-2">If I am unavailable due to...</label>
                            <select
                                value={willConfig.condition}
                                onChange={e => setWillConfig({ ...willConfig, condition: e.target.value as any })}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                            >
                                <option value="death">Death (Certificate Required)</option>
                                <option value="illness">Severe Illness (Medical Report Required)</option>
                                <option value="absence">Extended Absence</option>
                                <option value="other">Other Reason</option>
                            </select>
                            {willConfig.condition === 'other' && (
                                <input
                                    type="text"
                                    placeholder="Specify reason..."
                                    value={(willConfig as any).customCondition || ''}
                                    onChange={e => setWillConfig({ ...willConfig, customCondition: e.target.value } as any)}
                                    className="mt-2 w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                                    required
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Then perform this action...</label>
                            <select
                                value={willConfig.action}
                                onChange={e => setWillConfig({ ...willConfig, action: e.target.value as any })}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                            >
                                <option value="transfer_access">Transfer Access to Beneficiary</option>
                                <option value="delete_account">Permanently Delete My Account</option>
                            </select>
                        </div>

                        {willConfig.action === 'transfer_access' && (
                            <div>
                                <label className="block text-gray-300 mb-2">Beneficiary Email</label>
                                <input
                                    type="email"
                                    value={willConfig.beneficiaryEmail || ''}
                                    onChange={e => setWillConfig({ ...willConfig, beneficiaryEmail: e.target.value })}
                                    placeholder="trustee@example.com"
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                                    required
                                />
                            </div>
                        )}

                        <button disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition-colors w-full">
                            {loading ? 'Saving...' : 'Save Will Configuration'}
                        </button>
                    </form>
                </div>
            )}

            {/* --- REQUEST TAB --- */}
            {activeTab === 'request' && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Request Access</h2>
                    <p className="text-gray-400 mb-6">
                        Submit a request to the System Admin. Valid proof is required and will be verified manually.
                    </p>

                    <form onSubmit={handleRequestSubmit} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-gray-300 mb-2">Target Account Email</label>
                            <input
                                type="email"
                                value={targetEmail}
                                onChange={e => setTargetEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Reason for Request</label>
                            <select
                                value={requestType}
                                onChange={e => setRequestType(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                            >
                                <option value="death">Death of Owner</option>
                                <option value="illness">Medical Incapacity</option>
                                <option value="absence">Long-term Absence</option>
                                <option value="other">Other</option>
                            </select>
                            {requestType === 'other' && (
                                <input
                                    type="text"
                                    placeholder="Please specify additional details..."
                                    value={customRequestReason}
                                    onChange={e => setCustomRequestReason(e.target.value)}
                                    className="mt-2 w-full bg-gray-900 border border-gray-600 rounded p-3 text-white"
                                    required
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-gray-300 mb-2">Upload Proof Document</label>
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-500 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    className="opacity-0 absolute inset-0 cursor-pointer"
                                    onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                    accept=".pdf,.jpg,.png"
                                />
                                <FileText className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">{file ? file.name : 'Upload Death Certificate / Medical Report'}</p>
                            </div>
                        </div>

                        <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-colors">
                            {loading ? 'Submitting...' : 'Submit Request to Admin'}
                        </button>
                    </form>
                </div>
            )}

            {/* --- ADMIN TAB --- */}
            {activeTab === 'admin' && isAdmin && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400">Emergency Access Requests</h2>
                    {adminRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No pending requests.</p>
                    ) : (
                        adminRequests.map(req => (
                            <div key={req.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg text-white">Request #{req.id.slice(0, 6)}</span>
                                            <span className="bg-yellow-600 text-black text-xs font-bold px-2 py-0.5 rounded capitalize">{req.requestType}</span>
                                        </div>
                                        <p className="text-sm text-gray-300">Requester: <span className="text-white">{req.requesterEmail}</span></p>
                                        <p className="text-sm text-gray-300">Target: <span className="text-white">{req.targetUserEmail}</span></p>
                                        <p className="text-xs text-gray-500 mt-1">Date: {new Date(req.requestedAt).toLocaleDateString()}</p>
                                    </div>
                                    {req.proofDocumentUrl && (
                                        <a href={req.proofDocumentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 text-sm hover:underline">
                                            <FileText size={14} /> View Proof
                                        </a>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-700">
                                    <button
                                        onClick={() => handleAdminApprove(req.id, 'transfer_access')}
                                        className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Check size={16} /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleAdminApprove(req.id, 'reject')}
                                        className="flex-1 bg-red-900 hover:bg-red-800 text-white py-2 rounded flex items-center justify-center gap-2 text-sm"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
