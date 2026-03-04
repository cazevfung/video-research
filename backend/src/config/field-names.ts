/**
 * Centralized field name constants for Firestore documents
 * 
 * This file ensures consistent field naming across the codebase
 * and prevents issues with hardcoded field names.
 * 
 * IMPORTANT: Always use these constants instead of hardcoding field names.
 */

/**
 * User identifier field names
 * 
 * - USER_UID: Firebase Auth UID (stable identifier) - PRIMARY FIELD
 * - USER_ID: Deprecated field kept for backward compatibility during migration
 * 
 * All new records should use USER_UID. USER_ID is only maintained for
 * backward compatibility with existing records.
 */
export const USER_UID_FIELD = 'user_uid';
export const USER_ID_FIELD = 'user_id'; // Deprecated - use USER_UID_FIELD instead

/**
 * Get the primary user identifier field name
 * Always returns USER_UID_FIELD for new code
 */
export function getUserIdentifierField(): string {
  return USER_UID_FIELD;
}

/**
 * Get the deprecated user identifier field name
 * Only used for backward compatibility queries
 */
export function getDeprecatedUserIdentifierField(): string {
  return USER_ID_FIELD;
}


