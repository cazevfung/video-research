/**
 * Centralized System Messages Configuration
 * Phase 7: Streamlined and unified error messages, user feedback, and system notifications
 * This ensures consistency across the application and makes it easy to update messages
 */

/**
 * Error Messages
 */
export const errorMessages = {
  // Connection errors
  connectionLost: "Generating...",
  connectionLostReconnecting: "Generating...",
  connectionLostPermanent: "Connection lost. Please try again.",
  connectionFailed: "Failed to connect to server. Please check your connection.",
  connectionFailedAfterRetries: "Failed to connect after multiple attempts",
  heartbeatTimeout: "Connection timeout. The server may be slow to respond.",
  connectionClosedNoProgress: "Connection closed before any progress was received. Please try again.",
  
  // Job errors
  jobStartFailed: "Failed to start job",
  jobInvalidResponse: "Invalid response from server",
  jobReconnectFailed: "Failed to reconnect. Please try starting a new job.",
  jobUnknownError: "Unknown error occurred",
  
  // API errors
  apiNetworkError: "Failed to connect to server. Please check your connection.",
  apiRateLimit: "Rate limit exceeded. Please try again later.",
  apiQuotaExceeded: "Daily quota exceeded. Please try again tomorrow.",
  apiHttpError: (status: number) => `Request failed with status ${status}`,
  apiUnknownError: "An unknown error occurred",
  
  // Form errors
  formNoUrls: "Please provide at least one valid YouTube URL",
  formNoPreset: "Please select a prompt preset to continue",
  formInvalidUrls: "Invalid YouTube URL(s) detected. Please check the format.",
  
  // History errors
  historyLoadFailed: "Failed to load history",
  historySummaryLoadFailed: "Failed to load summary details",
  
  // Config errors
  configLoadFailed: "Failed to load configuration",
  
  // Clipboard errors
  clipboardCopyFailed: "Failed to copy to clipboard",
  
  // Streaming errors (Phase 5)
  streamingParsingError: "The streaming data couldn't be processed correctly. The system will try a different approach.",
  streamingConnectionError: "Connection lost during streaming. Reconnecting...",
  streamingTimeoutError: "Streaming timeout. The server may be slow to respond.",
  streamingFallbackError: "Streaming mode encountered an issue. The system has switched to standard mode and will continue processing.",
  
  // Generic errors
  somethingWentWrong: "Something went wrong",
  unexpectedError: "An unexpected error occurred",
  
  // Authentication errors (Phase 2: Email/Password Auth, Phase 5: Complete Error Handling)
  authEmailAlreadyInUse: "An account with this email already exists.",
  authInvalidEmail: "Invalid email address.",
  authOperationNotAllowed: "Email/password authentication is not enabled.",
  authWeakPassword: "Password is too weak. Please use a stronger password.",
  authUserDisabled: "This account has been disabled.",
  authUserNotFound: "No account found with this email address.",
  authWrongPassword: "Incorrect password. Please try again.",
  authTooManyRequests: "Too many failed attempts. Please try again later.",
  authNetworkRequestFailed: "Network error. Please check your connection.",
  authInvalidCredential: "Invalid email or password.",
  authDefaultError: "An error occurred during authentication.",
  authNotEnabled: "Firebase Auth is not enabled.",
  authDisabled: "Authentication is not enabled on this server. Please contact the administrator.",
  // Additional Firebase Auth errors (Phase 5)
  authRequiresRecentLogin: "This operation requires recent authentication. Please sign in again.",
  authCredentialAlreadyInUse: "This credential is already associated with a different account.",
  authInvalidActionCode: "The action code is invalid or has expired.",
  authExpiredActionCode: "The action code has expired.",
  authInvalidVerificationCode: "The verification code is invalid.",
  authInvalidVerificationId: "The verification ID is invalid.",
  authMissingVerificationCode: "The verification code is missing.",
  authMissingVerificationId: "The verification ID is missing.",
  authCodeExpired: "The verification code has expired.",
  authQuotaExceeded: "The quota for this operation has been exceeded.",
  authUnauthorizedDomain: "This domain is not authorized for OAuth operations.",
  authAccountExistsWithDifferentCredential: "An account already exists with the same email but different sign-in credentials.",
  authPopupBlocked: "The popup was blocked by the browser.",
  authPopupClosedByUser: "The popup was closed by the user before completing the sign-in.",
  authCancelledPopupRequest: "Only one popup request is allowed at one time.",
  authAppDeleted: "This instance of FirebaseApp has been deleted.",
  authAppNotAuthorized: "This app is not authorized to use Firebase Authentication.",
  authArgumentError: "An invalid argument was provided to the authentication method.",
  authInvalidApiKey: "The provided API key is invalid.",
  authInvalidUserToken: "The user's credential is no longer valid. The user must sign in again.",
  authInvalidTenantId: "The tenant ID provided is invalid.",
  authTenantIdMismatch: "The provided tenant ID does not match the Auth instance's tenant ID.",
  authOperationNotSupported: "This operation is not supported in the environment this application is running on.",
  authTimeout: "The operation timed out.",
  authUnimplemented: "The requested operation is not implemented.",
  authUserMismatch: "The supplied credentials do not correspond to the previously signed in user.",
  authUserTokenExpired: "The user's credential has expired. The user must sign in again.",
  authWebStorageUnsupported: "This browser is not supported or 3rd party cookies and data may be disabled.",
  
  // Guest access errors (Phase 3)
  guestLimitReached: "You've reached your guest limit. Please login to create more summaries.",
  guestSummaryNotFound: "Guest summary not found or session expired.",
  guestSessionExpired: "Your guest session has expired. Please refresh the page.",
  guestSessionInvalid: "Invalid guest session. Please refresh the page.",
  
  // Research-specific errors (Phase 6)
  researchInvalidQuery: "Please provide a research query between 10-500 characters.",
  researchInsufficientCredits: "Not enough credits. This research costs ~200 credits.",
  researchRateLimitExceeded: "You've reached your hourly research limit. Please try again later.",
  researchSearchFailed: "Failed to search for videos. Please try again.",
  researchNoVideosFound: "Couldn't find enough quality videos on this topic.",
  researchTranscriptError: "Failed to fetch transcripts for most videos.",
  researchGenerationTimeout: "Summary generation took too long. Please try a narrower topic.",
  researchJobStartFailed: "Failed to start research job. Please try again.",
  researchConnectionLost: "Connection lost during research. Reconnecting...",
  researchGuestLimitReached: "You've reached your guest research limit. Please login to create more research.",
} as const;

/**
 * Success Messages
 */
export const successMessages = {
  summaryCompleted: "Summary completed!",
  copiedToClipboard: "Copied to clipboard!",
  savedToLibrary: "Saved to library",
  connectionRestored: "Connection restored",
} as const;

/**
 * Warning Messages
 */
export const warningMessages = {
  noValidUrls: "Paste at least one YouTube URL to continue",
  noPresetSelected: "Please select a prompt preset to continue",
  connectionLost: "Generating...",
  heartbeatTimeout: "No response from server. Connection may be slow.",
  
  // Guest access warnings (Phase 3)
  guestViewing: "You're viewing as a guest. This summary will not be saved.",
  guestLoginPrompt: "Login to save your summaries and unlock more features.",
} as const;

/**
 * Info Messages
 */
export const infoMessages = {
  processing: "Processing...",
  waitingForContent: "Waiting for content...",
  starting: "Starting...",
  reconnecting: (attempt: number) => `Reconnecting... (Attempt ${attempt} of 5)`,
} as const;

/**
 * Markdown parsing/rendering messages (Phase 5)
 * Configurable via env: NEXT_PUBLIC_MARKDOWN_RENDER_FALLBACK_MESSAGE
 */
export const markdownMessages = {
  /** Shown when markdown fails to render and we fall back to plain text */
  renderFallback:
    process.env.NEXT_PUBLIC_MARKDOWN_RENDER_FALLBACK_MESSAGE ||
    "Markdown could not be rendered. Showing plain text below.",
} as const;

/**
 * Empty State Messages
 */
export const emptyStateMessages = {
  noHistory: "No summaries yet. Create your first summary to get started!",
  noUrls: "Paste at least one YouTube URL to continue",
  noValidUrls: "No valid URLs detected. Please check the format.",
} as const;

/**
 * Accessibility Messages (for screen readers)
 */
export const a11yMessages = {
  progress: (percent: number) => `Progress: ${percent} percent`,
  processingStatus: (status: string) => `Processing status: ${status}`,
  connectionStatus: (status: "connected" | "disconnected" | "reconnecting") => {
    switch (status) {
      case "connected":
        return "Connection established";
      case "disconnected":
        return "Connection lost";
      case "reconnecting":
        return "Reconnecting to server";
    }
  },
} as const;

/**
 * Firebase Auth Error Code to User-Friendly Message Mapping
 * Phase 2: Email/Password Authentication
 * Centralized error message mapping for Firebase Auth errors
 */
/**
 * Firebase Auth Error Code to User-Friendly Message Mapping
 * Phase 5: Complete error code mapping with all common Firebase Auth errors
 * Centralized error message mapping for Firebase Auth errors
 */
export const firebaseAuthErrorMessages: Record<string, string> = {
  // Email/password authentication errors
  'auth/email-already-in-use': errorMessages.authEmailAlreadyInUse,
  'auth/invalid-email': errorMessages.authInvalidEmail,
  'auth/operation-not-allowed': errorMessages.authOperationNotAllowed,
  'auth/weak-password': errorMessages.authWeakPassword,
  'auth/user-disabled': errorMessages.authUserDisabled,
  'auth/user-not-found': errorMessages.authUserNotFound,
  'auth/wrong-password': errorMessages.authWrongPassword,
  'auth/too-many-requests': errorMessages.authTooManyRequests,
  'auth/network-request-failed': errorMessages.authNetworkRequestFailed,
  'auth/invalid-credential': errorMessages.authInvalidCredential,
  
  // Additional Firebase Auth error codes (Phase 5)
  'auth/requires-recent-login': errorMessages.authRequiresRecentLogin,
  'auth/credential-already-in-use': errorMessages.authCredentialAlreadyInUse,
  'auth/invalid-action-code': errorMessages.authInvalidActionCode,
  'auth/expired-action-code': errorMessages.authExpiredActionCode,
  'auth/invalid-verification-code': errorMessages.authInvalidVerificationCode,
  'auth/invalid-verification-id': errorMessages.authInvalidVerificationId,
  'auth/missing-verification-code': errorMessages.authMissingVerificationCode,
  'auth/missing-verification-id': errorMessages.authMissingVerificationId,
  'auth/code-expired': errorMessages.authCodeExpired,
  'auth/quota-exceeded': errorMessages.authQuotaExceeded,
  'auth/unauthorized-domain': errorMessages.authUnauthorizedDomain,
  'auth/account-exists-with-different-credential': errorMessages.authAccountExistsWithDifferentCredential,
  'auth/popup-blocked': errorMessages.authPopupBlocked,
  'auth/popup-closed-by-user': errorMessages.authPopupClosedByUser,
  'auth/cancelled-popup-request': errorMessages.authCancelledPopupRequest,
  'auth/app-deleted': errorMessages.authAppDeleted,
  'auth/app-not-authorized': errorMessages.authAppNotAuthorized,
  'auth/argument-error': errorMessages.authArgumentError,
  'auth/invalid-api-key': errorMessages.authInvalidApiKey,
  'auth/invalid-user-token': errorMessages.authInvalidUserToken,
  'auth/invalid-tenant-id': errorMessages.authInvalidTenantId,
  'auth/tenant-id-mismatch': errorMessages.authTenantIdMismatch,
  'auth/operation-not-supported-in-this-environment': errorMessages.authOperationNotSupported,
  'auth/timeout': errorMessages.authTimeout,
  'auth/unimplemented': errorMessages.authUnimplemented,
  'auth/user-mismatch': errorMessages.authUserMismatch,
  'auth/user-token-expired': errorMessages.authUserTokenExpired,
  'auth/web-storage-unsupported': errorMessages.authWebStorageUnsupported,
};

/**
 * Get user-friendly error message for Firebase Auth error
 * @param error - Firebase Auth error (with code property) or Error object
 * @returns User-friendly error message
 */
export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = error.code as string;
    if (errorCode in firebaseAuthErrorMessages) {
      return firebaseAuthErrorMessages[errorCode];
    }
  }
  
  if (error instanceof Error) {
    return error.message || errorMessages.authDefaultError;
  }
  
  return errorMessages.authDefaultError;
}