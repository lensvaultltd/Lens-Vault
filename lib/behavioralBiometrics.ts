/**
 * Behavioral Biometrics Service
 * Continuous authentication through typing patterns and mouse movements
 * INDUSTRY-FIRST FEATURE
 */

export interface BehavioralProfile {
    userId: string;
    typingPattern: TypingMetrics;
    mousePattern: MouseMetrics;
    confidence: number;
    lastUpdated: Date;
}

export interface TypingMetrics {
    avgKeyPressTime: number;
    avgKeyInterval: number;
    commonBigrams: Map<string, number>;
    typingSpeed: number; // WPM
    errorRate: number;
}

export interface MouseMetrics {
    avgVelocity: number;
    avgAcceleration: number;
    clickPattern: number[];
    movementCurvature: number;
    preferredDirection: string;
}

export interface BiometricEvent {
    type: 'keypress' | 'mousemove' | 'click';
    timestamp: number;
    data: any;
}

export class BehavioralBiometrics {
    private profile: BehavioralProfile | null = null;
    private baselineProfile: BehavioralProfile | null = null;
    private events: BiometricEvent[] = [];
    private isMonitoring: boolean = false;
    private deviationThreshold: number = 0.7;

    private keyPressTimestamps: Map<string, number> = new Map();
    private lastKeyPress: number = 0;
    private mousePositions: Array<{ x: number, y: number, timestamp: number }> = [];

    /**
     * Start monitoring user behavior
     */
    startMonitoring(userId: string) {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.profile = {
            userId,
            typingPattern: this.initializeTypingMetrics(),
            mousePattern: this.initializeMouseMetrics(),
            confidence: 0,
            lastUpdated: new Date()
        };

        // Attach event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;

        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('click', this.handleClick.bind(this));
    }

    /**
     * Handle keyboard events
     */
    private handleKeyDown(event: KeyboardEvent) {
        if (!this.isMonitoring || !this.profile) return;

        const key = event.key;
        const timestamp = event.timeStamp;

        this.keyPressTimestamps.set(key, timestamp);

        // Calculate interval from last key press
        if (this.lastKeyPress > 0) {
            const interval = timestamp - this.lastKeyPress;
            this.updateTypingMetrics(interval);
        }

        this.lastKeyPress = timestamp;

        this.events.push({
            type: 'keypress',
            timestamp,
            data: { key, interval: timestamp - this.lastKeyPress }
        });
    }

    private handleKeyUp(event: KeyboardEvent) {
        if (!this.isMonitoring || !this.profile) return;

        const key = event.key;
        const timestamp = event.timeStamp;
        const pressTime = this.keyPressTimestamps.get(key);

        if (pressTime) {
            const duration = timestamp - pressTime;
            this.updateKeyPressDuration(duration);
            this.keyPressTimestamps.delete(key);
        }
    }

    /**
     * Handle mouse events
     */
    private handleMouseMove(event: MouseEvent) {
        if (!this.isMonitoring || !this.profile) return;

        const position = {
            x: event.clientX,
            y: event.clientY,
            timestamp: event.timeStamp
        };

        this.mousePositions.push(position);

        // Keep only last 100 positions
        if (this.mousePositions.length > 100) {
            this.mousePositions.shift();
        }

        // Calculate velocity and acceleration
        if (this.mousePositions.length >= 3) {
            this.updateMouseMetrics();
        }

        this.events.push({
            type: 'mousemove',
            timestamp: event.timeStamp,
            data: position
        });
    }

    private handleClick(event: MouseEvent) {
        if (!this.isMonitoring || !this.profile) return;

        this.events.push({
            type: 'click',
            timestamp: event.timeStamp,
            data: { x: event.clientX, y: event.clientY }
        });
    }

    /**
     * Update typing metrics
     */
    private updateTypingMetrics(interval: number) {
        if (!this.profile) return;

        const metrics = this.profile.typingPattern;

        // Update average interval (exponential moving average)
        metrics.avgKeyInterval = metrics.avgKeyInterval === 0
            ? interval
            : (metrics.avgKeyInterval * 0.9) + (interval * 0.1);
    }

    private updateKeyPressDuration(duration: number) {
        if (!this.profile) return;

        const metrics = this.profile.typingPattern;

        // Update average press time
        metrics.avgKeyPressTime = metrics.avgKeyPressTime === 0
            ? duration
            : (metrics.avgKeyPressTime * 0.9) + (duration * 0.1);
    }

    /**
     * Update mouse metrics
     */
    private updateMouseMetrics() {
        if (!this.profile || this.mousePositions.length < 3) return;

        const recent = this.mousePositions.slice(-3);
        const metrics = this.profile.mousePattern;

        // Calculate velocity
        const dx = recent[2].x - recent[1].x;
        const dy = recent[2].y - recent[1].y;
        const dt = recent[2].timestamp - recent[1].timestamp;

        if (dt > 0) {
            const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
            metrics.avgVelocity = metrics.avgVelocity === 0
                ? velocity
                : (metrics.avgVelocity * 0.9) + (velocity * 0.1);
        }

        // Calculate acceleration
        const dx1 = recent[1].x - recent[0].x;
        const dy1 = recent[1].y - recent[0].y;
        const dt1 = recent[1].timestamp - recent[0].timestamp;

        if (dt > 0 && dt1 > 0) {
            const v1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) / dt1;
            const v2 = Math.sqrt(dx * dx + dy * dy) / dt;
            const acceleration = Math.abs(v2 - v1) / dt;

            metrics.avgAcceleration = metrics.avgAcceleration === 0
                ? acceleration
                : (metrics.avgAcceleration * 0.9) + (acceleration * 0.1);
        }
    }

    /**
     * Analyze deviation from baseline
     */
    async analyzeDeviation(): Promise<{
        isAnomaly: boolean;
        confidence: number;
        deviationScore: number;
        details: string;
    }> {
        if (!this.profile || !this.baselineProfile) {
            return {
                isAnomaly: false,
                confidence: 0,
                deviationScore: 0,
                details: 'Insufficient data for analysis'
            };
        }

        const typingDeviation = this.calculateTypingDeviation();
        const mouseDeviation = this.calculateMouseDeviation();

        const overallDeviation = (typingDeviation + mouseDeviation) / 2;
        const isAnomaly = overallDeviation > this.deviationThreshold;

        return {
            isAnomaly,
            confidence: 1 - overallDeviation,
            deviationScore: overallDeviation,
            details: `Typing deviation: ${(typingDeviation * 100).toFixed(1)}%, Mouse deviation: ${(mouseDeviation * 100).toFixed(1)}%`
        };
    }

    /**
     * Calculate typing pattern deviation
     */
    private calculateTypingDeviation(): number {
        if (!this.profile || !this.baselineProfile) return 0;

        const current = this.profile.typingPattern;
        const baseline = this.baselineProfile.typingPattern;

        const pressTimeDiff = Math.abs(current.avgKeyPressTime - baseline.avgKeyPressTime) / baseline.avgKeyPressTime;
        const intervalDiff = Math.abs(current.avgKeyInterval - baseline.avgKeyInterval) / baseline.avgKeyInterval;

        return (pressTimeDiff + intervalDiff) / 2;
    }

    /**
     * Calculate mouse pattern deviation
     */
    private calculateMouseDeviation(): number {
        if (!this.profile || !this.baselineProfile) return 0;

        const current = this.profile.mousePattern;
        const baseline = this.baselineProfile.mousePattern;

        const velocityDiff = Math.abs(current.avgVelocity - baseline.avgVelocity) / baseline.avgVelocity;
        const accelDiff = Math.abs(current.avgAcceleration - baseline.avgAcceleration) / baseline.avgAcceleration;

        return (velocityDiff + accelDiff) / 2;
    }

    /**
     * Save baseline profile
     */
    async saveBaseline() {
        if (!this.profile) return;

        this.baselineProfile = JSON.parse(JSON.stringify(this.profile));

        // Save to local storage
        localStorage.setItem('behavioral_baseline', JSON.stringify(this.baselineProfile));
    }

    /**
     * Load baseline profile
     */
    async loadBaseline(userId: string) {
        const stored = localStorage.getItem('behavioral_baseline');

        if (stored) {
            this.baselineProfile = JSON.parse(stored);
        }
    }

    /**
     * Trigger re-authentication if anomaly detected
     */
    async triggerReAuthentication() {
        // Emit event for app to handle
        const event = new CustomEvent('biometric-anomaly', {
            detail: {
                message: 'Unusual behavior detected. Please verify your identity.',
                timestamp: new Date()
            }
        });

        window.dispatchEvent(event);
    }

    // Initialize empty metrics
    private initializeTypingMetrics(): TypingMetrics {
        return {
            avgKeyPressTime: 0,
            avgKeyInterval: 0,
            commonBigrams: new Map(),
            typingSpeed: 0,
            errorRate: 0
        };
    }

    private initializeMouseMetrics(): MouseMetrics {
        return {
            avgVelocity: 0,
            avgAcceleration: 0,
            clickPattern: [],
            movementCurvature: 0,
            preferredDirection: 'none'
        };
    }
}

// Export singleton instance
export const behavioralBiometrics = new BehavioralBiometrics();
