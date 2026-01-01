// Production-safe logger utility
// Replaces console.log statements with proper logging

const isDevelopment = import.meta.env.DEV;

class Logger {
    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]) {
        if (!isDevelopment && level === 'debug') {
            // Skip debug logs in production
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case 'error':
                console.error(prefix, message, ...args);
                // [OBSERVABILITY] TODO: Integrate project with Sentry or LogRocket for production error tracking
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'info':
                if (isDevelopment) {
                    console.info(prefix, message, ...args);
                }
                break;
            case 'debug':
                if (isDevelopment) {
                    console.log(prefix, message, ...args);
                }
                break;
        }
    }

    info(message: string, ...args: any[]) {
        this.log('info', message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log('warn', message, ...args);
    }

    error(message: string, ...args: any[]) {
        this.log('error', message, ...args);
    }

    debug(message: string, ...args: any[]) {
        this.log('debug', message, ...args);
    }
}

export const logger = new Logger();
