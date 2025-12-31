import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'entrance' | 'glow' | 'exit'>('entrance');

    useEffect(() => {
        // Timeline of animations
        const glowTimer = setTimeout(() => setPhase('glow'), 800);
        const exitTimer = setTimeout(() => setPhase('exit'), 2000);
        const completeTimer = setTimeout(() => onComplete(), 2500);

        return () => {
            clearTimeout(glowTimer);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative group">
                {/* Background Glow Effect */}
                <div className={`absolute inset-0 bg-primary/20 blur-[100px] rounded-full transition-all duration-1000 transform scale-150 ${phase === 'glow' ? 'opacity-100' : 'opacity-0'}`} />

                {/* Logo Container */}
                <div className={`relative transition-all duration-700 transform ${phase === 'entrance' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}>
                    <div className="relative bg-background/50 backdrop-blur-md p-6 rounded-3xl border border-primary/20 shadow-2xl animate-float">
                        <img
                            src="/logo-transparent.png"
                            alt="Lens Vault Logo"
                            className={`h-24 w-auto transition-all duration-1000 ${phase === 'glow' ? 'brightness-110 drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]' : ''}`}
                        />
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className={`absolute -top-4 -right-4 transition-all duration-500 delay-500 ${phase === 'glow' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                    <div className="bg-gradient-accent p-2 rounded-full shadow-lg">
                        <Shield className="h-4 w-4 text-primary-foreground" />
                    </div>
                </div>
            </div>

            {/* Loading Text */}
            <div className={`mt-12 text-center transition-all duration-500 delay-700 ${phase === 'glow' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h1 className="text-2xl font-bold text-gradient-heading mb-2">Lens Vault</h1>
                <div className="flex items-center gap-2 justify-center text-muted-foreground text-sm font-medium tracking-widest uppercase">
                    <span className="animate-pulse">Securing</span>
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    <span className="animate-pulse delay-75">Your</span>
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    <span className="animate-pulse delay-150">Vault</span>
                </div>
            </div>

            {/* Progress Bar (Visual only) */}
            <div className={`mt-8 w-48 h-1 bg-muted rounded-full overflow-hidden transition-all duration-500 delay-300 ${phase === 'glow' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="h-full bg-gradient-accent animate-progress" />
            </div>
        </div>
    );
};

export default SplashScreen;
