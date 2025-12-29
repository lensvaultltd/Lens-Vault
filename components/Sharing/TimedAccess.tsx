import React, { useState, useEffect } from 'react';
import { Clock, Lock, Unlock, Plus } from 'lucide-react';
import { TimedShare } from '../../types';

export const TimedAccess: React.FC<{ userEmail: string }> = ({ userEmail }) => {
    const [shares, setShares] = useState<TimedShare[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form state
    const [recipient, setRecipient] = useState('');
    const [data, setData] = useState(''); // In real app, this is a vault item selector
    const [duration, setDuration] = useState('1');
    const [unit, setUnit] = useState<'weeks' | 'months' | 'years'>('months');

    useEffect(() => {
        fetchShares();
    }, [userEmail]);

    const fetchShares = async () => {
        try {
            const res = await fetch(`/api/share/timed/received?email=${userEmail}`);
            if (res.ok) {
                const data = await res.json();
                setShares(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateReleaseDate = () => {
        const date = new Date();
        const val = parseInt(duration);
        if (unit === 'weeks') date.setDate(date.getDate() + val * 7);
        if (unit === 'months') date.setMonth(date.getMonth() + val);
        if (unit === 'years') date.setFullYear(date.getFullYear() + val);
        return date.toISOString();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const releaseDate = calculateReleaseDate();

        // Mock encrypted data generation
        const mockEncrypted = `ENCRYPTED_DATA_FOR_${recipient}`;

        const res = await fetch('/api/share/timed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderEmail: userEmail,
                recipientEmail: recipient,
                encryptedData: mockEncrypted,
                releaseDate
            })
        });

        if (res.ok) {
            alert('Digital Will created!');
            setShowCreate(false);
            // ideally refresh sent items too, but here we list received
        } else {
            alert('Failed to create');
        }
    };

    return (
        <div className="p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="w-6 h-6 text-yellow-400" />
                    Digital Will / Timed Access
                </h2>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    <Plus size={20} /> New Will
                </button>
            </div>

            {showCreate && (
                <form onSubmit={handleCreate} className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Create Timed Access</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Recipient Email</label>
                            <input
                                type="email"
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vault Data (Mock Selector)</label>
                            <input
                                type="text"
                                value={data}
                                onChange={e => setData(e.target.value)}
                                placeholder="Select vault item..."
                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Release After</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    className="w-20 bg-gray-700 text-white p-2 rounded border border-gray-600"
                                />
                                <select
                                    value={unit}
                                    onChange={e => setUnit(e.target.value as any)}
                                    className="bg-gray-700 text-white p-2 rounded border border-gray-600 flex-1"
                                >
                                    <option value="weeks">Weeks</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Releases on: {new Date(calculateReleaseDate()).toLocaleDateString()}
                            </p>
                        </div>
                        <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-2 rounded hover:bg-yellow-400">
                            Create Digital Will
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-4">
                {loading ? (
                    <p>Loading...</p>
                ) : shares.length === 0 ? (
                    <p className="text-gray-400">No timed shares received.</p>
                ) : (
                    shares.map(share => (
                        <div key={share.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">From: {share.senderEmail}</span>
                                    {/* Fix: Checking boolean value directly instead of string comparison for isLocked */}
                                    {(share as any).isLocked ? ( // Using 'as any' to bypass strict check if generic type doesn't have isLocked yet
                                        <span className="bg-red-900 text-red-200 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                            <Lock size={12} /> Locked
                                        </span>
                                    ) : (
                                        <span className="bg-green-900 text-green-200 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                            <Unlock size={12} /> Unlocked
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 mt-1">
                                    Available on: {new Date(share.releaseDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                {!(share as any).isLocked && (
                                    <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm">
                                        View Data
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
