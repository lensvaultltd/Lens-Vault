/**
 * Performance Optimization Utilities
 * Code splitting, lazy loading, and caching strategies
 */

import { lazy, ComponentType } from 'react';

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
    retries = 3
): React.LazyExoticComponent<T> {
    return lazy(async () => {
        for (let i = 0; i < retries; i++) {
            try {
                return await componentImport();
            } catch (error) {
                if (i === retries - 1) throw error;

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
        throw new Error('Failed to load component');
    });
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Memoize expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(
    func: T,
    maxCacheSize = 100
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func(...args);
        cache.set(key, result);

        // Limit cache size
        if (cache.size > maxCacheSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }

        return result;
    }) as T;
}

/**
 * Request deduplication
 */
class RequestDeduplicator {
    private pending = new Map<string, Promise<any>>();

    async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
        if (this.pending.has(key)) {
            return this.pending.get(key)!;
        }

        const promise = request().finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, promise);
        return promise;
    }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Image lazy loading with intersection observer
 */
export function lazyLoadImage(img: HTMLImageElement): void {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const image = entry.target as HTMLImageElement;
                const src = image.dataset.src;

                if (src) {
                    image.src = src;
                    image.removeAttribute('data-src');
                    observer.unobserve(image);
                }
            }
        });
    });

    observer.observe(img);
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: 'script' | 'style' | 'image' | 'font'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;

    if (as === 'font') {
        link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
}

/**
 * Service Worker registration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
}

/**
 * Cache API wrapper
 */
export class CacheManager {
    private cacheName = 'lens-vault-v1';

    async cache(url: string, response: Response): Promise<void> {
        const cache = await caches.open(this.cacheName);
        await cache.put(url, response);
    }

    async getCached(url: string): Promise<Response | undefined> {
        const cache = await caches.open(this.cacheName);
        return cache.match(url);
    }

    async clearCache(): Promise<void> {
        await caches.delete(this.cacheName);
    }
}

export const cacheManager = new CacheManager();

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
    private marks = new Map<string, number>();

    mark(name: string): void {
        this.marks.set(name, performance.now());
    }

    measure(name: string, startMark: string): number {
        const start = this.marks.get(startMark);
        if (!start) {
            console.warn(`Start mark "${startMark}" not found`);
            return 0;
        }

        const duration = performance.now() - start;
        console.log(`${name}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            console.log(`${name}: ${duration.toFixed(2)}ms`);
        }
    }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Virtual scrolling helper
 */
export function calculateVisibleRange(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan = 3
): { start: number; end: number } {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);

    return { start, end };
}
