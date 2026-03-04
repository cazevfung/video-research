'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { setTokenGetter } from '@/lib/auth-token';
import { shouldSkipAuth, validateAuthBypass } from '@/lib/auth';
import { getFirebaseAuthErrorMessage, errorMessages } from '@/config/messages';
import { isFirebaseAuthEnabled } from '@/config/env';
import { getGuestSessionId, getOrCreateGuestSessionId, clearGuestSession, getGuestSummaryCount } from '@/utils/guest-session.utils';
import { getDevModeAccountType } from '@/utils/dev-mode';
import { trackGuestToAuthenticatedConversion } from '@/utils/analytics';
import { apiBaseUrl, apiEndpoints } from '@/config/api';
import { getGuestLanguagePreference, clearGuestLanguagePreference } from '@/utils/cookies';
import { updateLanguagePreference } from '@/lib/api';
import { SUPPORTED_LANGUAGES } from '@/config/languages';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean; // Whether user is authenticated
  isGuest: boolean; // Phase 3: Guest access support
  guestSessionId: string | null; // Phase 3: Guest session ID
  signIn: () => Promise<void>; // Google OAuth (existing)
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>; // NEW
  signUpWithEmailAndPassword: (email: string, password: string, name: string) => Promise<void>; // NEW
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase Authentication state
 * Supports feature flag to enable/disable Firebase Auth
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize guest session ID synchronously if window is available
  // This ensures guest session is available immediately on mount (if not authenticated)
  const [guestSessionId, setGuestSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // Only create guest session if we're not in dev mode with skipAuth
      const skipAuth = shouldSkipAuth();
      if (!skipAuth) {
        return getOrCreateGuestSessionId();
      }
    }
    return null;
  });
  
  const useFirebaseAuth = isFirebaseAuthEnabled(); // Centralized config
  const skipAuth = shouldSkipAuth();

  // Phase 3: Update guest session ID when auth state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !user && !loading && !skipAuth) {
      const guestId = getOrCreateGuestSessionId();
      setGuestSessionId(guestId);
    } else if (user) {
      // Clear guest session when user logs in
      setGuestSessionId(null);
    }
  }, [user, loading, skipAuth]);

  useEffect(() => {
    // Validate auth configuration in development mode
    if (process.env.NODE_ENV === 'development') {
      validateAuthBypass();
    }
    
    // If auth is being skipped (dev mode), skip Firebase initialization
    // Phase 1: Support dev mode account toggle (guest vs dev user)
    if (skipAuth) {
      const accountType = typeof window !== 'undefined' ? getDevModeAccountType() : 'dev';
      if (accountType === 'guest') {
        // Act as guest: guest session, no user, no token (backend uses X-Guest-Session-Id)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔓 AuthProvider: Dev mode account=guest - using guest session');
        }
        setUser(null);
        setGuestSessionId(getOrCreateGuestSessionId());
        setTokenGetter(() => Promise.resolve(null));
        setLoading(false);
      } else {
        // Dev user: no guest, no token (backend uses DEV_USER_ID)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔓 AuthProvider: Auth bypassed - dev user (backend DEV_USER_ID)');
        }
        clearGuestSession();
        setUser(null);
        setGuestSessionId(null);
        setTokenGetter(() => Promise.resolve(null));
        setLoading(false);
      }
      return;
    }
    
    if (!useFirebaseAuth) {
      // Firebase Auth is disabled, check for JWT token in localStorage
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  AuthProvider: Firebase Auth is disabled');
      }
      
      // Check if there's an existing JWT token in localStorage
      const existingToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (existingToken) {
        // Set token getter to return JWT token from localStorage
        setTokenGetter(async () => {
          const token = localStorage.getItem('auth_token');
          return token;
        });
        
        // Try to restore user state by fetching user data from backend
        // This will be handled by the API calls that need auth
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Restored JWT token getter from localStorage');
        }
      } else {
        setTokenGetter(() => Promise.resolve(null));
      }
      
      setLoading(false);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      // Phase 3: Clear guest session when user logs in
      if (firebaseUser) {
        // Track guest-to-authenticated conversion before clearing
        const previousGuestSessionId = getGuestSessionId();
        const hadSummary = previousGuestSessionId ? getGuestSummaryCount() > 0 : false;
        
        if (previousGuestSessionId) {
          trackGuestToAuthenticatedConversion(previousGuestSessionId, hadSummary);
        }
        
        clearGuestSession();
        setGuestSessionId(null);
      } else {
        // Phase 3: Set guest session ID when not authenticated
        const guestId = getOrCreateGuestSessionId();
        setGuestSessionId(guestId);
      }
      
      // Update token getter when user changes
      if (firebaseUser) {
        setTokenGetter(async () => {
          try {
            // Force refresh to ensure token is always valid
            // Firebase SDK handles caching and refresh timing automatically
            // Pass true to force refresh if token is expired or close to expiry
            const token = await firebaseUser.getIdToken(true);
            
            // Phase 3: Record token refresh metric
            if (typeof window !== 'undefined') {
              const { recordTokenRefresh } = await import('@/lib/metrics');
              recordTokenRefresh();
            }
            
            return token;
          } catch (error) {
            console.error('Error getting ID token:', error);
            
            // If token refresh fails, user needs to re-authenticate
            if (error instanceof Error) {
              if (error.message.includes('auth/network-request-failed')) {
                console.error('Network error during token refresh');
              } else if (error.message.includes('auth/user-token-expired')) {
                console.error('Token expired and refresh failed, user needs to re-login');
              }
            }
            
            return null;
          }
        });
      } else {
        setTokenGetter(() => Promise.resolve(null));
      }
    });

    return unsubscribe;
  }, [useFirebaseAuth, skipAuth]);

  const signIn = async () => {
    if (skipAuth) {
      // Auth is bypassed in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 AuthProvider: signIn() called but auth is bypassed (dev mode)');
      }
      return;
    }
    
    if (!useFirebaseAuth) {
      // Fallback: Firebase Auth is disabled
      console.warn('⚠️  AuthProvider: Firebase Auth is disabled');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
    if (skipAuth) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 AuthProvider: signInWithEmailAndPassword() called but auth is bypassed (dev mode)');
      }
      return;
    }
    
    // If Firebase Auth is enabled, use Firebase
    if (useFirebaseAuth) {
      try {
        const { signInWithEmailAndPassword: firebaseSignIn } = await import('firebase/auth');
        await firebaseSignIn(auth, email, password);
        // onAuthStateChanged will update user state automatically
        return;
      } catch (error) {
        console.error('Sign in error:', error);
        // Transform Firebase error to user-friendly message
        const friendlyError = new Error(getFirebaseAuthErrorMessage(error));
        // Preserve original error code if available
        if (error && typeof error === 'object' && 'code' in error) {
          (friendlyError as any).code = (error as any).code;
        }
        throw friendlyError;
      }
    }
    
    // If Firebase Auth is disabled, use backend JWT login
    try {
      const loginUrl = `${apiBaseUrl}${apiEndpoints.authLogin}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Using backend JWT login (localhost dev mode)', { loginUrl, email });
      }
      
      let response: Response;
      try {
        response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
      } catch (fetchError) {
        // Network error (backend not running, CORS, connection refused, etc.)
        const errorMessage = fetchError instanceof Error 
          ? fetchError.message 
          : 'Network error';
        
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Login failed - Network error:', {
            error: errorMessage,
            loginUrl,
            message: 'Make sure the backend server is running and accessible',
          });
        }
        
        throw new Error(
          `Cannot connect to server. Please make sure the backend is running at ${apiBaseUrl}`
        );
      }

      if (!response.ok) {
        let errorMessage = 'Invalid email or password';
        let errorData: any = null;
        let responseText: string | null = null;
        let parseError: Error | null = null;
        let responseStatus: number | undefined;
        let responseStatusText: string | undefined;
        
        // Safely extract response properties
        try {
          responseStatus = response.status;
          responseStatusText = response.statusText;
        } catch (e) {
          // Response object might be corrupted
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Could not read response.status/statusText:', e);
          }
        }
        
        try {
          // Clone response BEFORE reading so we can use it for debugging
          const responseClone = response.clone();
          const contentType = response.headers?.get?.('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = await response.json();
              // Handle empty JSON object or null
              if (errorData && typeof errorData === 'object') {
                errorMessage = errorData.error?.message || errorData.message || errorMessage;
                
                // Handle specific error codes from backend
                if (errorData.error?.code === 'NOT_IMPLEMENTED' && responseStatus === 501) {
                  // Authentication is disabled on the backend
                  errorMessage = errorMessages.authDisabled;
                } else if (errorData.error?.code === 'BAD_REQUEST' && errorData.error?.message?.includes('Firebase Auth')) {
                  // Backend says to use Firebase Auth instead
                  errorMessage = errorMessages.authNotEnabled;
                }
              } else if (!errorData) {
                errorMessage = `Server error (${responseStatus || 'unknown'} ${responseStatusText || 'unknown'})`;
              }
            } catch (jsonError) {
              parseError = jsonError instanceof Error ? jsonError : new Error(String(jsonError));
              // If JSON parsing fails, try to get text from clone
              try {
                responseText = await responseClone.text();
                if (responseText) {
                  errorMessage = responseText;
                } else {
                  errorMessage = `Server error (${responseStatus || 'unknown'} ${responseStatusText || 'unknown'})`;
                }
              } catch {
                errorMessage = `Server error (${responseStatus || 'unknown'} ${responseStatusText || 'unknown'})`;
              }
            }
          } else {
            // Non-JSON response, try to get text
            try {
              responseText = await response.text();
              errorMessage = responseText || errorMessage;
            } catch (textError) {
              parseError = textError instanceof Error ? textError : new Error(String(textError));
              errorMessage = `Server error (${responseStatus || 'unknown'} ${responseStatusText || 'unknown'})`;
            }
          }
          
          // Handle 501 status code specifically (Authentication disabled)
          if (responseStatus === 501 && !errorMessage.includes('not enabled')) {
            errorMessage = errorMessages.authDisabled;
          }
        } catch (generalError) {
          // Catch-all for any other errors
          parseError = generalError instanceof Error ? generalError : new Error(String(generalError));
          errorMessage = `Server error (${responseStatus || 'unknown'} ${responseStatusText || 'unknown'})`;
          
          // If we got a 501 but couldn't parse the response, still show auth disabled message
          if (responseStatus === 501) {
            errorMessage = errorMessages.authDisabled;
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          // Build logData with safe property access
          const logData: any = {
            timestamp: new Date().toISOString(),
            url: loginUrl,
            email: email ? email.substring(0, 3) + '***' : 'not provided', // Partial email for privacy
          };
          
          // Safely add response properties
          if (responseStatus !== undefined) {
            logData.status = responseStatus;
            logData.statusCode = responseStatus;
          } else {
            logData.status = 'unknown';
            logData.statusCode = 'unknown';
          }
          
          if (responseStatusText !== undefined) {
            logData.statusText = responseStatusText;
          } else {
            logData.statusText = 'unknown';
          }
          
          logData.errorMessage = errorMessage || 'No error message';
          
          if (errorData !== null) {
            try {
              logData.errorData = JSON.parse(JSON.stringify(errorData)); // Deep clone to avoid serialization issues
            } catch {
              logData.errorData = String(errorData);
            }
          } else {
            logData.errorData = 'No error data (response was not JSON or parse failed)';
          }
          
          if (responseText) {
            logData.responseText = responseText.substring(0, 500); // Limit length
          }
          
          if (parseError) {
            logData.parseError = {
              message: parseError.message || 'Unknown parse error',
              stack: parseError.stack || 'No stack trace',
              name: parseError.name || 'Error',
            };
          }
          
          // Only log headers if available (may not be in all environments)
          try {
            if (response.headers) {
              logData.headers = Object.fromEntries(response.headers.entries());
            }
          } catch (headerError) {
            logData.headerError = String(headerError);
          }
          
          // Ensure we always log something useful
          try {
            console.error('❌ Login failed:', logData);
          } catch (logError) {
            // Fallback if console.error fails or logData can't be serialized
            console.error('❌ Login failed:', {
              error: 'Failed to serialize error details',
              originalError: String(logError),
              status: responseStatus,
              statusText: responseStatusText,
              errorMessage,
              url: loginUrl,
            });
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }
      
      // Store JWT token in localStorage
      localStorage.setItem('auth_token', data.token);
      
      // Set token getter so API client can retrieve the JWT token
      setTokenGetter(async () => {
        const token = localStorage.getItem('auth_token');
        return token;
      });
      
      // Create a mock Firebase user object for compatibility
      // This allows the rest of the app to work with the user object
      const mockUser = {
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.name,
        emailVerified: true,
        // Add other required Firebase user properties
        getIdToken: async () => {
          const token = localStorage.getItem('auth_token');
          return token || data.token;
        },
        // Add metadata properties that Firebase User has
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
        // Add provider data
        providerData: [{
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.name,
          providerId: 'password',
        }],
      } as any as FirebaseUser;
      
      setUser(mockUser);
      setLoading(false);
      
      // Clear guest session after successful login
      clearGuestSession();
      
      // Phase 4: Migrate guest language preference if user doesn't have one
      if (!data.user.language_preference) {
        const guestLang = getGuestLanguagePreference();
        if (guestLang) {
          // Validate language code
          const isValidLanguage = SUPPORTED_LANGUAGES.some(
            lang => lang.code === guestLang
          );
          
          if (isValidLanguage) {
            // Migrate asynchronously (don't block login)
            updateLanguagePreference(guestLang)
              .then((response) => {
                if (response.data && !response.error) {
                  clearGuestLanguagePreference();
                  if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Migrated guest language preference to user account:', guestLang);
                  }
                }
              })
              .catch((error) => {
                console.error('Failed to migrate guest language preference:', error);
              });
          } else {
            // Invalid language code - clear cookie
            clearGuestLanguagePreference();
          }
        }
      } else {
        // User already has language preference - clear guest cookie if exists
        const guestLang = getGuestLanguagePreference();
        if (guestLang) {
          clearGuestLanguagePreference();
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Login successful (backend JWT)', { userId: data.user.id, email: data.user.email });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmailAndPassword = async (
    email: string,
    password: string,
    name: string
  ): Promise<void> => {
    if (skipAuth) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 AuthProvider: signUpWithEmailAndPassword() called but auth is bypassed (dev mode)');
      }
      return;
    }
    
    if (!useFirebaseAuth) {
      throw new Error(errorMessages.authNotEnabled);
    }
    
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
      }
      
      // onAuthStateChanged will update user state automatically
      // Backend will automatically create user in database via getOrCreateUserByUid()
    } catch (error) {
      console.error('Sign up error:', error);
      // Transform Firebase error to user-friendly message
      const friendlyError = new Error(getFirebaseAuthErrorMessage(error));
      // Preserve original error code if available
      if (error && typeof error === 'object' && 'code' in error) {
        (friendlyError as any).code = (error as any).code;
      }
      throw friendlyError;
    }
  };

  const signOut = async () => {
    if (skipAuth) {
      // Auth is bypassed in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 AuthProvider: signOut() called but auth is bypassed (dev mode)');
      }
      return;
    }
    
    if (!useFirebaseAuth) {
      // Handle JWT logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      setTokenGetter(() => Promise.resolve(null));
      setUser(null);
      
      // Phase 3: Restore guest session after logout
      const guestId = getOrCreateGuestSessionId();
      setGuestSessionId(guestId);
      return;
    }
    
    try {
      await firebaseSignOut(auth);
      setTokenGetter(() => Promise.resolve(null));
      
      // Phase 3: Restore guest session after logout
      const guestId = getOrCreateGuestSessionId();
      setGuestSessionId(guestId);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (skipAuth) {
      // Auth is bypassed in dev mode, return null token
      if (process.env.NODE_ENV === 'development') {
        console.log('🔓 AuthProvider: getIdToken() called but auth is bypassed (dev mode)');
      }
      return null;
    }
    
    if (!useFirebaseAuth || !user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Get ID token error:', error);
      return null;
    }
  };

  // Phase 4: Migrate guest language preference to user account on login
  const migrationAttemptedRef = useRef<string | null>(null); // Track which user ID we've attempted migration for
  
  useEffect(() => {
    // Only run migration when user becomes authenticated (Firebase Auth only)
    // JWT login migration is handled in signInWithEmailAndPassword
    if (!user || loading || skipAuth || !useFirebaseAuth) {
      return;
    }

    // Skip if we've already attempted migration for this user
    const userId = user.uid;
    if (migrationAttemptedRef.current === userId) {
      return;
    }

    // Mark migration as attempted for this user
    migrationAttemptedRef.current = userId;

    // Check for guest language cookie and migrate if user has no language preference
    const migrateGuestLanguagePreference = async () => {
      try {
        // Wait a bit for user data to be fetched by UserDataContext
        // This gives time for the /auth/me API call to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get token for API call
        let token: string | null = null;
        try {
          token = await user.getIdToken();
        } catch (error) {
          console.error('Failed to get token for migration:', error);
          return;
        }

        // Get current user data to check if they have a language preference
        const response = await fetch(`${apiBaseUrl}${apiEndpoints.authMe}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If API call fails, skip migration (user data might not be ready yet)
          return;
        }

        const data = await response.json();
        const userData = data.user;

        // Only migrate if user doesn't have a language preference
        if (!userData?.language_preference) {
          const guestLang = getGuestLanguagePreference();
          
          if (guestLang) {
            // Validate language code
            const isValidLanguage = SUPPORTED_LANGUAGES.some(
              lang => lang.code === guestLang
            );

            if (isValidLanguage) {
              // Migrate guest language preference to user account
              const updateResponse = await updateLanguagePreference(guestLang);
              
              if (updateResponse.data && !updateResponse.error) {
                // Migration successful - clear cookie
                clearGuestLanguagePreference();
                
                if (process.env.NODE_ENV === 'development') {
                  console.log('✅ Migrated guest language preference to user account:', guestLang);
                }
              } else {
                // Migration failed, but don't clear cookie (user can try again)
                console.warn('Failed to migrate guest language preference:', updateResponse.error);
              }
            } else {
              // Invalid language code in cookie - clear it
              console.warn('Invalid language code in guest cookie, clearing:', guestLang);
              clearGuestLanguagePreference();
            }
          }
        } else {
          // User already has a language preference - clear guest cookie if it exists
          // (to avoid confusion, but don't overwrite user's preference)
          const guestLang = getGuestLanguagePreference();
          if (guestLang) {
            clearGuestLanguagePreference();
          }
        }
      } catch (error) {
        // Migration failed - log but don't throw (don't block login)
        console.error('Error migrating guest language preference:', error);
      }
    };

    // Run migration asynchronously (don't block login)
    migrateGuestLanguagePreference();
  }, [user, loading, skipAuth, useFirebaseAuth]);

  // Phase 3: Determine if user is a guest
  const isGuest = !user && !loading && !!guestSessionId;
  const isAuthenticated = !!user && !loading;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isGuest,
        guestSessionId,
        signIn,
        signInWithEmailAndPassword,
        signUpWithEmailAndPassword,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

