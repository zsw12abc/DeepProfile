import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistorySection } from './HistorySection';
import { type UserHistoryRecord, type ProfileData, type SupportedPlatform } from '~types';
import { type MacroCategory } from '~services/TopicService';



// Mock TopicService
vi.mock('~services/TopicService', () => ({
  TopicService: {
    getCategoryName: (category: string) => `Category: ${category}`,
  },
}));

// Mock LabelUtils
vi.mock('~services/LabelUtils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    calculateFinalLabel: (label: string, score: number) => ({ label, percentage: Math.abs(score) * 100 }),
    parseLabelName: (labelName: string) => {
      if (labelName.includes('vs')) {
        const [left, right] = labelName.split('vs').map(s => s.trim());
        return { left, right };
      }
      return { left: '', right: labelName };
    }
  };
});

// Mock components
vi.mock('./UIComponents', () => ({
  Card: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="card">
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

// Mock data
const mockHistoryRecords: UserHistoryRecord[] = [
  {
    userId: 'user123',
    platform: 'zhihu' as SupportedPlatform,
    profiles: {
      'tech': {
        category: 'tech' as MacroCategory,
        profileData: {
          nickname: 'Test User',
          summary: 'This is a test summary',
          value_orientation: [
            { label: 'innovation', score: 0.8 },
            { label: 'practicality', score: 0.6 }
          ]
        },
        timestamp: Date.now()
      }
    },
    userInfo: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    }
  }
];

describe('HistorySection', () => {
  const defaultProps = {
    historyRecords: mockHistoryRecords,
    loadingHistory: false,
    isExporting: false,
    handleDeleteProfile: vi.fn(),
    handleDeleteUser: vi.fn(),
    handleClearAllHistory: vi.fn(),
    handleExportMarkdown: vi.fn(),
    handleExportImage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders history section with records', () => {
    render(<HistorySection {...defaultProps} />);

    expect(screen.getByText('历史记录')).toBeInTheDocument();
    expect(screen.getByText('总计 1 用户 (最大 200)')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Category: tech')).toBeInTheDocument();
  });

  it('shows loading state when loadingHistory is true', () => {
    render(<HistorySection {...defaultProps} loadingHistory={true} />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when no history records', () => {
    render(<HistorySection {...defaultProps} historyRecords={[]} />);

    expect(screen.getByText('暂无历史记录')).toBeInTheDocument();
  });

  it('calls handleDeleteUser when delete button is clicked', async () => {
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: vi.fn(() => true),
    });

    render(<HistorySection {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(defaultProps.handleDeleteUser).toHaveBeenCalledWith('user123', 'zhihu');
    });
  });

  it('calls handleExportMarkdown when export markdown button is clicked', async () => {
    render(<HistorySection {...defaultProps} />);

    const exportButtons = screen.getAllByText('📝');
    fireEvent.click(exportButtons[0]); // Click the first markdown export button

    await waitFor(() => {
      expect(defaultProps.handleExportMarkdown).toHaveBeenCalledWith(
        expect.any(Object),
        'tech',
        'user123',
        expect.any(Number)
      );
    });
  });

  it('calls handleExportImage when export image button is clicked', async () => {
    render(<HistorySection {...defaultProps} />);

    const exportButtons = screen.getAllByText('📸');
    fireEvent.click(exportButtons[0]); // Click the first image export button

    await waitFor(() => {
      expect(defaultProps.handleExportImage).toHaveBeenCalledWith(
        expect.any(Object),
        'tech',
        'user123',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  it('disables export image button when isExporting is true', () => {
    render(<HistorySection {...defaultProps} isExporting={true} />);

    const exportImageButtons = screen.getAllByText('📸');
    expect(exportImageButtons[0]).toBeDisabled();
  });

  it('shows clear all button when there are records', () => {
    render(<HistorySection {...defaultProps} />);

    expect(screen.getByText('清除所有')).toBeInTheDocument();
  });

  it('calls handleClearAllHistory when clear all button is clicked', async () => {
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: vi.fn(() => true),
    });

    render(<HistorySection {...defaultProps} />);

    fireEvent.click(screen.getByText('清除所有'));

    await waitFor(() => {
      expect(defaultProps.handleClearAllHistory).toHaveBeenCalled();
    });
  });
});