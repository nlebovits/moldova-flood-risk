/**
 * First-run tutorial dismissal — the only persisted preference in the app.
 * Stored in localStorage so "don't show this again" survives reloads.
 *
 * KEY is versioned: bump the suffix to re-trigger the tutorial for everyone
 * after a meaningful content change. All access is try/catch-wrapped so
 * disabled / private-mode storage degrades gracefully (treated as "not
 * dismissed" → the tutorial simply shows each visit rather than throwing).
 */

const KEY = 'md-flood-onboarding-v1';

export function isOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === 'dismissed';
  } catch {
    return false;
  }
}

export function setOnboardingDismissed(v: boolean): void {
  try {
    if (v) localStorage.setItem(KEY, 'dismissed');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — nothing to persist */
  }
}
