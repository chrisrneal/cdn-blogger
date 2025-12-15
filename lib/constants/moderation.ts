/**
 * Validation constants for moderation features
 */

export const MODERATION_CONSTANTS = {
  /** Maximum length for flag reason text */
  MAX_FLAG_REASON_LENGTH: 500,
  
  /** Maximum length for moderation notes */
  MAX_MODERATION_NOTES_LENGTH: 1000,
  
  /** Number of flags that automatically changes status to 'flagged' */
  AUTO_FLAG_THRESHOLD: 3,
  
  /** Default limit for moderation queue results */
  DEFAULT_MODERATION_QUEUE_LIMIT: 50,
  
  /** Maximum limit for moderation queue results */
  MAX_MODERATION_QUEUE_LIMIT: 100,
} as const;
