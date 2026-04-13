jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: jest.fn(() => 0),
}));

jest.mock('@/hooks/useStackHeaderHeight', () => ({
  useStackHeaderHeight: jest.fn(() => 0),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/components/ScreenWithWallpaper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ScreenWithWallpaper: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('@/api/notifications', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { NotificationsScreen } from '@/screens/NotificationsScreen';

describe('NotificationsScreen', () => {
  const useQueryMock = useQuery as jest.Mock;
  const useMutationMock = useMutation as jest.Mock;
  const useQueryClientMock = useQueryClient as jest.Mock;
  const useNavigationMock = useNavigation as jest.Mock;
  const useAuthStoreMock = useAuthStore as unknown as jest.Mock;
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationMock.mockReturnValue({
      navigate,
    });

    useAuthStoreMock.mockImplementation((selector?: (state: { user: { id: string } }) => unknown) => {
      const state = { user: { id: 'host-1' } };
      return selector ? selector(state) : state;
    });

    useQueryClientMock.mockReturnValue({
      invalidateQueries: jest.fn(),
    });

    useMutationMock.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  it('renders meetup RSVP notifications with the joined copy', () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'notif-1',
          type: 'MEETUP_RSVP',
          actor: { name: 'Alex' },
          post_id: 'post-1',
          post: { content_text: 'Sunday beach meetup' },
          created_at: '2026-04-12T00:00:00.000Z',
          read_at: null,
        },
      ],
      isLoading: false,
    });

    render(<NotificationsScreen />);

    expect(screen.getByText('Alex joined your meetup')).toBeTruthy();
  });

  it('renders dog interaction notifications and does not navigate without a post id', () => {
    useQueryMock.mockReturnValue({
      data: [
        {
          id: 'notif-2',
          type: 'DOG_INTERACTION',
          actor: { name: 'Taylor' },
          post_id: null,
          post: null,
          created_at: '2026-04-12T00:00:00.000Z',
          read_at: null,
        },
      ],
      isLoading: false,
    });

    render(<NotificationsScreen />);

    const row = screen.getByText('Taylor marked that your dog met their dog');
    expect(row).toBeTruthy();
    fireEvent.press(row);
    expect(navigate).not.toHaveBeenCalled();
  });
});
