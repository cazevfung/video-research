/**
 * Phase 4: Dev Mode Panel – component tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevModePanel } from '../DevModePanel';

const mockShowToast = jest.fn();
const mockRefetchUserData = jest.fn().mockResolvedValue(undefined);
const mockRefetchTier = jest.fn().mockResolvedValue(undefined);
const mockUpdateCreditsOptimistically = jest.fn();
const mockHealthCheck = jest.fn().mockResolvedValue({
  data: {
    status: 'ok',
    storage: { mode: 'local', fileCount: 5 },
    auth: { enabled: false, mode: 'jwt' },
    version: '1.0',
  },
});

jest.mock('@/config/env', () => ({
  isDevelopmentMode: jest.fn(() => true),
  getDevUserId: () => 'dev-user-1',
  shouldSkipAuth: () => true,
}));

jest.mock('@/lib/api', () => ({
  healthCheck: (...args: unknown[]) => mockHealthCheck(...args),
  invalidateCache: jest.fn(),
}));

jest.mock('@/config/api', () => ({
  apiEndpoints: {
    creditsBalance: '/api/credits/balance',
    tierStatus: '/api/tier/status',
    authMe: '/auth/me',
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isGuest: false }),
}));

jest.mock('@/contexts/UserDataContext', () => ({
  useUserDataContext: () => ({
    credits: { balance: 100 },
    refetchUserData: mockRefetchUserData,
    refetchTier: mockRefetchTier,
    updateCreditsOptimistically: mockUpdateCreditsOptimistically,
  }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/config/guest', () => ({ guestConfig: { maxSummaries: 1, maxResearch: 3 } }));
jest.mock('@/config/tier', () => ({ getAllTiers: () => ['free', 'starter', 'pro', 'premium'], formatTierName: (t: string) => t }));

// Prevent reload in tests
const reload = jest.fn();
Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });

describe('DevModePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('@/config/env').isDevelopmentMode as jest.Mock).mockReturnValue(true);
  });

  it('renders DEV MODE header when in development mode', async () => {
    render(<DevModePanel />);
    await waitFor(() => {
      expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument();
    });
  });

  it('does not render when not in development mode', async () => {
    (require('@/config/env').isDevelopmentMode as jest.Mock).mockReturnValue(false);
    const { container } = render(<DevModePanel />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('expands to show tabs when header is clicked', async () => {
    render(<DevModePanel />);
    await waitFor(() => {
      expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument();
    });
    const header = screen.getByRole('button', { name: /DEV MODE/i });
    await userEvent.click(header);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Account/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Testing/i })).toBeInTheDocument();
    });
  });

  it('shows Status tab content when expanded', async () => {
    render(<DevModePanel />);
    await waitFor(() => expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /DEV MODE/i }));
    await waitFor(() => {
      expect(screen.getByText(/Backend Status/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  it('switches to Account tab on click', async () => {
    render(<DevModePanel />);
    await waitFor(() => expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /DEV MODE/i }));
    await waitFor(() => expect(screen.getByRole('tab', { name: /Account/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name: /Account/i }));
    await waitFor(() => {
      expect(screen.getByText(/Credit Override/i)).toBeInTheDocument();
    });
  });

  it('switches to Testing tab on click', async () => {
    render(<DevModePanel />);
    await waitFor(() => expect(screen.getByText(/DEV MODE/i)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /DEV MODE/i }));
    await waitFor(() => expect(screen.getByRole('tab', { name: /Testing/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('tab', { name: /Testing/i }));
    await waitFor(() => {
      expect(screen.getByText(/SSE Simulation/i)).toBeInTheDocument();
    });
  });
});
