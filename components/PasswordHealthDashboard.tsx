/**
 * Password Health Dashboard Component
 * Visual dashboard showing password security metrics
 */

import React from 'react';
import { usePasswordHealth, PasswordIssue } from '../hooks/usePasswordHealth';
import { Shield, AlertTriangle, Clock, RefreshCw, CheckCircle } from 'lucide-react';

export const PasswordHealthDashboard: React.FC = () => {
    const { health, loading, error, refresh } = usePasswordHealth();

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error: {error}</p>
                <button onClick={refresh} className="mt-2 text-red-600 hover:text-red-800">
                    Try Again
                </button>
            </div>
        );
    }

    if (!health) return null;

    return (
        <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Password Health Score</h2>
                        <p className="text-blue-100">
                            {health.strongPasswords} of {health.totalPasswords} passwords are strong
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="text-6xl font-bold">{health.overallScore}</div>
                        <div className="text-sm text-blue-100">out of 100</div>
                    </div>
                </div>

                {/* Score Bar */}
                <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
                    <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${health.overallScore}%` }}
                    />
                </div>

                <button
                    onClick={refresh}
                    className="mt-4 flex items-center gap-2 text-white/90 hover:text-white"
                >
                    <RefreshCw size={16} />
                    Refresh Analysis
                </button>
            </div>

            {/* Issue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <IssueCard
                    title="Breached"
                    count={health.breachedPasswords.length}
                    severity="critical"
                    icon={<AlertTriangle />}
                    color="red"
                />

                <IssueCard
                    title="Weak"
                    count={health.weakPasswords.length}
                    severity="high"
                    icon={<Shield />}
                    color="orange"
                />

                <IssueCard
                    title="Reused"
                    count={health.reusedPasswords.length}
                    severity="medium"
                    icon={<RefreshCw />}
                    color="yellow"
                />

                <IssueCard
                    title="Old"
                    count={health.oldPasswords.length}
                    severity="low"
                    icon={<Clock />}
                    color="blue"
                />
            </div>

            {/* Detailed Issues */}
            {health.breachedPasswords.length > 0 && (
                <IssueSection
                    title="🚨 Breached Passwords - Change Immediately!"
                    issues={health.breachedPasswords}
                    color="red"
                />
            )}

            {health.weakPasswords.length > 0 && (
                <IssueSection
                    title="⚠️ Weak Passwords"
                    issues={health.weakPasswords}
                    color="orange"
                />
            )}

            {health.reusedPasswords.length > 0 && (
                <IssueSection
                    title="🔄 Reused Passwords"
                    issues={health.reusedPasswords}
                    color="yellow"
                />
            )}

            {health.oldPasswords.length > 0 && (
                <IssueSection
                    title="⏰ Old Passwords"
                    issues={health.oldPasswords}
                    color="blue"
                />
            )}

            {/* All Clear */}
            {health.overallScore === 100 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <CheckCircle className="mx-auto mb-3 text-green-600" size={48} />
                    <h3 className="text-xl font-bold text-green-800 mb-2">
                        Perfect Security! 🎉
                    </h3>
                    <p className="text-green-700">
                        All your passwords are strong, unique, and secure.
                    </p>
                </div>
            )}
        </div>
    );
};

// Issue Card Component
interface IssueCardProps {
    title: string;
    count: number;
    severity: string;
    icon: React.ReactNode;
    color: 'red' | 'orange' | 'yellow' | 'blue';
}

const IssueCard: React.FC<IssueCardProps> = ({ title, count, icon, color }) => {
    const colorClasses = {
        red: 'bg-red-50 border-red-200 text-red-800',
        orange: 'bg-orange-50 border-orange-200 text-orange-800',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return (
        <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="opacity-70">{icon}</span>
                <span className="text-3xl font-bold">{count}</span>
            </div>
            <div className="font-medium">{title}</div>
        </div>
    );
};

// Issue Section Component
interface IssueSectionProps {
    title: string;
    issues: PasswordIssue[];
    color: 'red' | 'orange' | 'yellow' | 'blue';
}

const IssueSection: React.FC<IssueSectionProps> = ({ title, issues, color }) => {
    const colorClasses = {
        red: 'bg-red-50 border-red-200',
        orange: 'bg-orange-50 border-orange-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        blue: 'bg-blue-50 border-blue-200'
    };

    return (
        <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
            <h3 className="text-lg font-bold mb-4">{title}</h3>
            <div className="space-y-3">
                {issues.map((issue) => (
                    <div key={issue.id} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-medium">{issue.title}</div>
                                {issue.url && (
                                    <div className="text-sm text-gray-500 mt-1">{issue.url}</div>
                                )}
                                <div className="text-sm mt-2 text-gray-700">
                                    {issue.recommendation}
                                </div>
                                {issue.strength !== undefined && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Strength: {issue.strength}/100
                                    </div>
                                )}
                                {issue.age !== undefined && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Last changed: {issue.age} days ago
                                    </div>
                                )}
                                {issue.reuseCount !== undefined && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Used in {issue.reuseCount} accounts
                                    </div>
                                )}
                            </div>
                            <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                                Fix Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
