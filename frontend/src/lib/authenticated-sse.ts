/**
 * Authenticated Server-Sent Events (SSE) Client
 * Uses Fetch API with ReadableStream to support authentication headers
 * This is required because EventSource API doesn't support custom headers
 * 
 * Provides an EventSource-like interface for authenticated SSE connections
 */

import { getAuthToken } from './auth-token';
import { getDevModeSSESimulation, clearDevModeSSESimulation } from '@/utils/dev-mode';

export type ReadyState = 0 | 1 | 2; // CONNECTING | OPEN | CLOSED

export interface AuthenticatedSSEOptions {
  /**
   * Headers to include in the request (in addition to Authorization header)
   */
  headers?: Record<string, string>;
  
  /**
   * Whether to include credentials (cookies) in the request
   * Default: false
   */
  withCredentials?: boolean;
  
  /**
   * Whether to enable automatic reconnection on errors
   * Default: false (let caller handle reconnection)
   */
  enableAutoReconnect?: boolean;
  
  /**
   * Maximum number of automatic reconnection attempts
   * Only used if enableAutoReconnect is true
   * Default: 5
   */
  maxReconnectAttempts?: number;

  /**
   * Called when the stream ends normally (read returns done=true).
   * Use to clear progress-based timeouts so they do not fire after stream end.
   */
  onStreamEnd?: () => void;
}

/**
 * Authenticated SSE Client
 * Implements an EventSource-like interface with authentication support
 */
export class AuthenticatedSSE {
  private url: string;
  private readyState: ReadyState = 0; // CONNECTING
  private abortController: AbortController | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private textDecoder: TextDecoder;
  private buffer: string = '';
  private reconnectAttempts: number = 0;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  // Phase 1: Connection state management to prevent race conditions
  // Phase 2: Enhanced connection state management for better resilience
  private isReading: boolean = false;
  private isClosing: boolean = false;
  private isConnecting: boolean = false;
  private connectionStartTime: number | null = null;
  private lastActivityTime: number | null = null;
  
  // Event handlers
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  // Event listeners (EventSource-compatible)
  private eventListeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();
  
  // Reconnection configuration
  private shouldReconnect: boolean = false; // Default: disabled, let caller handle reconnection
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private maxReconnectDelay: number = 30000; // Max 30 seconds
  
  // Options
  private options: AuthenticatedSSEOptions;

  // Phase 1: Dev mode SSE simulation (one-shot: drop or error after connect)
  private _devModeSSESimulation: 'drop' | 'error' | null = null;
  
  constructor(url: string, options: AuthenticatedSSEOptions = {}) {
    this.url = url;
    this.options = options;
    this.textDecoder = new TextDecoder('utf-8');
    
    // Configure reconnection based on options
    this.shouldReconnect = options.enableAutoReconnect ?? false;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    
    this.connect();
  }
  
  /**
   * Get current ready state
   */
  public get readyStateValue(): ReadyState {
    return this.readyState;
  }
  
  /**
   * Check if connection is open
   */
  public get isOpen(): boolean {
    return this.readyState === 1;
  }
  
  /**
   * Check if connection is closed
   */
  public get isClosed(): boolean {
    return this.readyState === 2;
  }
  
  /**
   * Connect to SSE endpoint
   * Phase 2: Enhanced connection state management
   */
  private async connect(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    
    // Phase 2: Prevent concurrent connection attempts
    if (this.isConnecting) {
      console.warn('[AuthenticatedSSE] Connection already in progress, skipping duplicate connect()');
      return;
    }
    
    this.isConnecting = true;
    this.readyState = 0; // CONNECTING
    this.connectionStartTime = Date.now();

    // Phase 1: Dev mode SSE simulation (one-shot, affects this connection only)
    if (typeof window !== 'undefined') {
      const sim = getDevModeSSESimulation();
      if (sim) {
        clearDevModeSSESimulation();
        if (sim === 'timeout') {
          this.isConnecting = false;
          this.handleError(new Error('Simulated timeout'));
          return;
        }
        if (sim === 'drop' || sim === 'error') {
          this._devModeSSESimulation = sim;
        }
      }
    }
    
    try {
      // Get authentication token
      const token = await getAuthToken();
      
      // Build headers
      const headers: HeadersInit = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...this.options.headers,
      };
      
      // Add Authorization header if token is available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Phase 3: Add guest session ID if no auth token
        const { getGuestSessionId } = await import('@/utils/guest-session.utils');
        const { guestConfig } = await import('@/config/guest');
        const guestSessionId = getGuestSessionId();
        if (guestSessionId) {
          headers[guestConfig.sessionHeaderName] = guestSessionId;
        }
      }
      
      // Create abort controller for cancellation
      this.abortController = new AbortController();
      
      // Make authenticated fetch request
      const response = await fetch(this.url, {
        method: 'GET',
        headers,
        credentials: this.options.withCredentials ? 'include' : 'same-origin',
        signal: this.abortController.signal,
      });
      
      // Check if response is OK
      if (!response.ok) {
        // Handle authentication errors (401)
        if (response.status === 401) {
          throw new Error('Authentication failed: Unauthorized');
        }
        
        // Handle other errors
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/event-stream')) {
        console.warn('Response is not text/event-stream, but continuing anyway');
      }
      
      // Get readable stream
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      this.reader = response.body.getReader();
      this.readyState = 1; // OPEN
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      this.lastActivityTime = Date.now();
      this.isConnecting = false; // Phase 2: Connection established
      
      // Phase 2: Log connection success with timing
      const connectionTime = this.connectionStartTime 
        ? Date.now() - this.connectionStartTime 
        : 0;
      console.log(`[AuthenticatedSSE] Connection established in ${connectionTime}ms`);
      
      // Trigger onopen event
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      
      // Dispatch 'open' event to listeners
      this.dispatchEvent('open', new Event('open'));

      // Phase 1: Dev mode SSE simulation - drop or error after 2s
      const sim = this._devModeSSESimulation;
      this._devModeSSESimulation = null;
      if (sim === 'drop') {
        setTimeout(() => {
          if (!this.isClosed) this.close();
        }, 2000);
      } else if (sim === 'error') {
        setTimeout(() => {
          if (!this.isClosed) this.handleError(new Error('Simulated network error'));
        }, 2000);
      }
      
      // Start reading stream
      this.readStream();
      
    } catch (error) {
      this.isConnecting = false; // Phase 2: Connection failed
      this.handleError(error);
    }
  }
  
  /**
   * Read from the stream
   * Phase 1: Fixed race condition by adding null checks before each read() call
   */
  private async readStream(): Promise<void> {
    // Phase 1: Prevent concurrent read operations
    if (this.isReading) {
      console.warn('[AuthenticatedSSE] readStream() called while already reading');
      return;
    }
    
    if (!this.reader) {
      return;
    }
    
    this.isReading = true;
    
    try {
      // Phase 1: Store reader reference locally to prevent race conditions
      let currentReader = this.reader;
      
      while (true) {
        // Phase 1: Check if reader is still valid before each read
        if (!currentReader || currentReader !== this.reader) {
          // Reader was replaced or nullified, stop reading
          console.log('[AuthenticatedSSE] Reader became invalid, stopping read stream');
          break;
        }
        
        // Phase 1: Check if we're closing to prevent reading during cleanup
        if (this.isClosing) {
          console.log('[AuthenticatedSSE] Connection closing, stopping read stream');
          break;
        }
        
        let readResult;
        try {
          // Phase 1: Wrap read operation in try-catch for better error handling
          readResult = await currentReader.read();
        } catch (readError) {
          // Phase 1: Handle read errors separately
          // Defensive check: ensure readError is defined before accessing properties
          if (readError && readError instanceof Error && readError.name === 'AbortError') {
            // Request was aborted during read
            console.log('[AuthenticatedSSE] Read aborted');
            this.close();
            return;
          }
          
          // Phase 1: Reader might have been cancelled, check if it's still valid
          if (!this.reader || this.reader !== currentReader) {
            console.log('[AuthenticatedSSE] Reader invalidated during read, stopping');
            break;
          }
          
          // Phase 1: Re-throw unexpected errors
          throw readError;
        }
        
        const { done, value } = readResult;
        
        if (done) {
          // Stream ended
          console.log('[AuthenticatedSSE] Stream ended (done=true)');
          this.options.onStreamEnd?.();
          this.close();
          break;
        }
        
        // Phase 1: Verify reader is still valid after read
        if (!this.reader || this.reader !== currentReader) {
          console.log('[AuthenticatedSSE] Reader invalidated after read, stopping');
          break;
        }
        
        // Decode chunk
        const chunk = this.textDecoder.decode(value, { stream: true });
        this.buffer += chunk;
        
        // Phase 2: Update last activity time on successful read
        this.lastActivityTime = Date.now();
        
        // Process complete SSE messages
        this.processBuffer();
      }
    } catch (error) {
      // Phase 1: Improved error handling - distinguish between error types
      // Defensive check: ensure error is defined before accessing properties
      if (error && error instanceof Error) {
        if (error.name === 'AbortError') {
          // Request was aborted, don't reconnect or trigger error handler
          console.log('[AuthenticatedSSE] Stream aborted');
          this.close();
          return;
        }
        
        // Phase 1: Check if reader became null (race condition)
        if (error.message.includes('null') || error.message.includes('read')) {
          console.error('[AuthenticatedSSE] Reader null error detected:', error.message);
          // Clean up gracefully
          this.close();
          return;
        }
      }
      
      // Phase 1: Only call handleError for unexpected errors
      if (!this.isClosing) {
        this.handleError(error);
      }
    } finally {
      // Phase 1: Reset reading flag
      this.isReading = false;
    }
  }
  
  /**
   * Process SSE buffer and extract messages
   * SSE format: "data: {json}\n\n" or "event: {name}\ndata: {json}\n\n"
   */
  private processBuffer(): void {
    let newlineIndex: number;
    
    // Process all complete messages (ending with \n\n)
    while ((newlineIndex = this.buffer.indexOf('\n\n')) !== -1) {
      const message = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 2);
      
      this.processMessage(message);
    }
  }
  
  /**
   * Process a single SSE message
   */
  private processMessage(message: string): void {
    const lines = message.split('\n');
    let eventType = 'message'; // Default event type
    let data = '';
    
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6).trim();
      } else if (line.startsWith('id: ')) {
        // SSE ID (optional, not used here but could be useful)
        // const id = line.slice(4).trim();
      } else if (line.startsWith('retry: ')) {
        // SSE retry interval (optional, not used here)
        // const retry = parseInt(line.slice(7).trim(), 10);
      }
    }
    
    if (data) {
      // Create message event
      const messageEvent = new MessageEvent(eventType, {
        data,
      });
      
      // Trigger onmessage handler for default 'message' events
      if (eventType === 'message' && this.onmessage) {
        this.onmessage(messageEvent);
      }
      
      // Dispatch event to listeners
      this.dispatchEvent(eventType, messageEvent);
    }
  }
  
  /**
   * Dispatch event to listeners
   */
  private dispatchEvent(eventType: string, event: Event | MessageEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        if (event instanceof MessageEvent) {
          listener(event);
        }
      });
    }
  }
  
  /**
   * Handle errors
   * Phase 1: Improved error handling with better error type distinction
   */
  private handleError(error: unknown): void {
    // Phase 1: Don't handle errors if we're already closing
    if (this.isClosing) {
      return;
    }
    
    // Defensive check: ensure error is defined before accessing properties
    if (error === null || error === undefined) {
      console.error('[AuthenticatedSSE] Error handler received null/undefined error');
      error = new Error('Unknown error');
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    // Phase 1: Log error with more context
    console.error('[AuthenticatedSSE] Error:', {
      message: errorMessage,
      name: errorName,
      readyState: this.readyState,
      isReading: this.isReading,
      hasReader: !!this.reader,
    });
    
    // Phase 1: Distinguish between error types
    const isAbortError = error instanceof Error && error.name === 'AbortError';
    const isNetworkError = error instanceof TypeError || 
                          errorMessage.toLowerCase().includes('network') ||
                          errorMessage.toLowerCase().includes('fetch');
    
    // Phase 1: For abort errors, just close without reconnection
    if (isAbortError) {
      this.close();
      return;
    }
    
    // Close current connection
    this.close();
    
    // Trigger onerror event (but not for abort errors)
    if (this.onerror && !isAbortError) {
      this.onerror(new Event('error'));
    }
    
    // Phase 1: Only attempt reconnection for network errors, not abort errors
    if (!isAbortError && this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      
      console.log(`[AuthenticatedSSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeoutId = setTimeout(() => {
        if (!this.isClosing) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[AuthenticatedSSE] Max reconnection attempts reached');
      if (this.onerror && !isAbortError) {
        this.onerror(new Event('error'));
      }
    }
  }
  
  /**
   * Close the connection
   * Phase 1: Fixed race condition by preventing multiple close() calls and proper cleanup order
   */
  public close(): void {
    // Phase 1: Prevent multiple close() calls
    if (this.isClosing || this.isClosed) {
      return;
    }
    
    this.isClosing = true;
    this.shouldReconnect = false; // Prevent reconnection after manual close
    
    // Phase 1: Cancel reader BEFORE setting to null to prevent race conditions
    if (this.reader) {
      try {
        // Phase 1: Cancel the reader first, then set to null
        const readerToCancel = this.reader;
        this.reader = null; // Set to null first to signal readStream() to stop
        readerToCancel.cancel().catch((err) => {
          // Phase 1: Ignore cancellation errors (reader might already be closed)
          console.log('[AuthenticatedSSE] Reader cancellation error (expected):', err);
        });
      } catch (err) {
        // Phase 1: Ignore errors during cancellation
        console.log('[AuthenticatedSSE] Error cancelling reader (expected):', err);
        this.reader = null;
      }
    }
    
    // Phase 1: Abort fetch request AFTER cancelling reader
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (err) {
        // Phase 1: Ignore abort errors (controller might already be aborted)
        console.log('[AuthenticatedSSE] Abort controller error (expected):', err);
      }
      this.abortController = null;
    }
    
    // Phase 1: Clear reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Phase 1: Set ready state to CLOSED after cleanup
    this.readyState = 2; // CLOSED
    
    // Clear buffer
    this.buffer = '';
    
    // Phase 2: Reset connection state tracking
    this.isConnecting = false;
    this.connectionStartTime = null;
    this.lastActivityTime = null;
    
    // Phase 1: Reset closing flag after a short delay to allow readStream() to finish
    // This prevents race conditions where readStream() might still be checking isClosing
    setTimeout(() => {
      this.isClosing = false;
    }, 100);
  }
  
  /**
   * Phase 2: Get connection health metrics
   * Useful for debugging and monitoring connection state
   */
  public getConnectionHealth(): {
    readyState: ReadyState;
    isReading: boolean;
    isConnecting: boolean;
    isClosing: boolean;
    hasReader: boolean;
    connectionAge: number | null;
    lastActivity: number | null;
    reconnectAttempts: number;
  } {
    return {
      readyState: this.readyState,
      isReading: this.isReading,
      isConnecting: this.isConnecting,
      isClosing: this.isClosing,
      hasReader: !!this.reader,
      connectionAge: this.connectionStartTime 
        ? Date.now() - this.connectionStartTime 
        : null,
      lastActivity: this.lastActivityTime 
        ? Date.now() - this.lastActivityTime 
        : null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
  
  /**
   * Add event listener (EventSource-compatible)
   */
  public addEventListener(
    type: string,
    listener: (event: MessageEvent) => void
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }
  
  /**
   * Remove event listener (EventSource-compatible)
   */
  public removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }
}

