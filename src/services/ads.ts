import { analytics } from './analytics';

/**
 * AdManager Abstraction for NEON RUSH
 *
 * Principles:
 * - Never covers gameplay or touch/keyboard controls.
 * - Never forces pre-roll ads before the first game or interrupts active runs.
 * - Never renders fake advertisements or deceptive buttons.
 * - Hides the optional rewarded-ad continue button when no real ad provider is configured.
 * - Provides clean DOM container hooks for desktop top banner, mobile bottom banner,
 *   and game-over medium rectangle slots.
 */

export type AdSlotType = 'desktop-top-banner' | 'mobile-bottom-banner' | 'gameover-rectangle';

export interface AdProviderSDK {
  name: string;
  isBannerAvailable: (slot: AdSlotType) => boolean;
  mountBanner: (slot: AdSlotType, container: HTMLElement) => void;
  unmountBanner?: (slot: AdSlotType, container: HTMLElement) => void;
  isRewardedAdReady: () => boolean;
  showRewardedAd: () => Promise<boolean>;
}

declare global {
  interface Window {
    __NEON_RUSH_AD_PROVIDER__?: AdProviderSDK;
  }
}

class AdManagerService {
  private provider: AdProviderSDK | null = null;
  private showSlotOutlines = true; // Shows clean, non-deceptive architectural slot boundary in portal layout

  constructor() {
    if (typeof window !== 'undefined' && window.__NEON_RUSH_AD_PROVIDER__) {
      this.provider = window.__NEON_RUSH_AD_PROVIDER__;
    }
  }

  /**
   * Connect a real ad network SDK (e.g., Google IMA, Poki SDK, CrazyGames SDK, AdinPlay)
   */
  public configureProvider(sdk: AdProviderSDK | null): void {
    this.provider = sdk;
  }

  public isProviderConfigured(): boolean {
    return this.provider !== null;
  }

  public isSlotActive(slot: AdSlotType): boolean {
    if (this.provider) {
      return this.provider.isBannerAvailable(slot);
    }
    return this.showSlotOutlines;
  }

  public setShowSlotOutlines(show: boolean): void {
    this.showSlotOutlines = show;
  }

  public mountSlot(slot: AdSlotType, element: HTMLElement | null): void {
    if (!element || !this.provider) return;
    try {
      this.provider.mountBanner(slot, element);
    } catch {
      // Fail gracefully if ad blocker or network failure occurs
    }
  }

  public unmountSlot(slot: AdSlotType, element: HTMLElement | null): void {
    if (!element || !this.provider || !this.provider.unmountBanner) return;
    try {
      this.provider.unmountBanner(slot, element);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Rewarded Ad Continue Architecture:
   * Returns true ONLY if an actual ad provider is configured and has a rewarded video ready.
   * When no ad provider is configured, this returns false so the UI hides the feature.
   */
  public canOfferRewardedContinue(alreadyUsedThisRun: boolean): boolean {
    if (alreadyUsedThisRun) return false;
    if (!this.provider) return false;
    try {
      return this.provider.isRewardedAdReady();
    } catch {
      return false;
    }
  }

  /**
   * Requests a rewarded ad to revive the player once per run.
   */
  public async requestRewardedContinue(): Promise<boolean> {
    if (!this.provider) return false;
    analytics.track('ad_requested', { type: 'rewarded_continue', provider: this.provider.name });
    try {
      const granted = await this.provider.showRewardedAd();
      if (granted) {
        analytics.track('ad_completed', { type: 'rewarded_continue', provider: this.provider.name });
      }
      return granted;
    } catch {
      return false;
    }
  }
}

export const adManager = new AdManagerService();
