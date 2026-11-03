import { AnalyticsEventName, AnalyticsEventPayload } from '../types/game';

/**
 * Privacy-first Analytics Abstraction for NEON RUSH.
 * Tracks strictly anonymous gameplay lifecycle telemetry without PII or registration.
 * Can be bridged to any web-game portal SDK (e.g., CrazyGames, Poki, Plausible) via registerAdapter().
 */

export type AnalyticsAdapter = (payload: AnalyticsEventPayload) => void;

class AnalyticsService {
  private recentEvents: AnalyticsEventPayload[] = [];
  private adapters: AnalyticsAdapter[] = [];
  private maxBufferSize = 50;

  public registerAdapter(adapter: AnalyticsAdapter): void {
    this.adapters.push(adapter);
  }

  public track(
    event: AnalyticsEventName,
    properties?: Record<string, string | number | boolean>
  ): void {
    const payload: AnalyticsEventPayload = {
      event,
      timestamp: Date.now(),
      properties,
    };

    this.recentEvents.unshift(payload);
    if (this.recentEvents.length > this.maxBufferSize) {
      this.recentEvents.pop();
    }

    // Dispatch to registered external adapters safely
    for (const adapter of this.adapters) {
      try {
        adapter(payload);
      } catch {
        // Never allow analytics errors to impact gameplay frame rate
      }
    }
  }

  public getRecentEvents(): AnalyticsEventPayload[] {
    return this.recentEvents;
  }
}

export const analytics = new AnalyticsService();
