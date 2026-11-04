import { sessionStorage } from '@/lib/supabase/session-storage';

import { createOnboardingDraftStore } from './onboarding-draft-store';

/**
 * Encrypted by SecureStore (Android Keystore, iOS Keychain), chunked like the
 * session, and excluded from Android Auto Backup by the config plugin.
 */
export const onboardingDraftStore = createOnboardingDraftStore(sessionStorage);
