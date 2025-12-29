import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { AccessLog } from '../../types';

export const AccessLogs: React.FC<{ userEmail: string }> = ({ userEmail }) => {
    const [logs, setLogs] = useState<AccessLog[]>([]);

    useEffect(() => {
        fetch(`/api/share/logs?email=${userEmail}`)
            .then(res => res.json())
            .then(data => setLogs(data))
            .catch(err => console.error(err));
    }, [userEmail]);

    return (
        <div className="p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                <Activity className="text-blue-400" />
                Access Audit Logs
            </h2>

            <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900 text-gray-400 text-sm uppercase">
                            <th className="p-4 border-b border-gray-700">Timestamp</th>
                            <th className="p-4 border-b border-gray-700">Action</th>
                            <th className="p-4 border-b border-gray-700">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.length === 0 ? (
                            <tr><td colSpan={3} className="p-4 text-center text-gray-500">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-750">
                                    <td className="p-4 text-sm text-gray-300">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs font-mono">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-300">
                                        {log.details}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
