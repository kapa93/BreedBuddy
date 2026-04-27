jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('@/hooks/useStackHeaderHeight', () => ({
  useStackHeaderHeight: jest.fn(() => 0),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { access_token: 'token-1' } } })),
    },
  },
}));

jest.mock('@/api/places', () => ({
  getGooglePlacePreview: jest.fn(),
  importGooglePlace: jest.fn(),
  getGooglePlacePhotoUrl: jest.fn(() => 'https://example.com/photo.jpg'),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GooglePlacePreviewScreen } from '@/screens/GooglePlacePreviewScreen';
import { importGooglePlace } from '@/api/places';

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;
const mockImportGooglePlace = importGooglePlace as jest.Mock;

const previewData = {
  googlePlaceId: 'google-1',
  name: 'Balboa Park',
  displayName: 'Balboa Park',
  formattedAddress: 'San Diego, CA',
  shortFormattedAddress: 'San Diego, CA',
  currentOpeningHours: { weekdayDescriptions: ['Monday: 8:00 AM - 5:00 PM'], openNow: true },
  attributions: [],
  photos: [{ name: 'places/google-1/photos/photo-1', widthPx: 100, heightPx: 100, authorAttributions: [] }],
  rating: 4.8,
  ratingCount: 1234,
  openNow: true,
  latitude: 32.7341,
  longitude: -117.1446,
  city: 'San Diego',
  neighborhood: null,
  placeType: 'park' as const,
  types: ['park'],
};

function setup({ importError }: { importError?: Error } = {}) {
  const navigate = jest.fn();
  const invalidateQueries = jest.fn();
  mockUseQueryClient.mockReturnValue({ invalidateQueries });

  mockUseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
    if (opts.queryKey[0] === 'googlePlacePreview') {
      return { data: previewData, isLoading: false, isError: false, error: null };
    }
    if (opts.queryKey[0] === 'googlePlacePhotoSession') {
      return { data: { access_token: 'token-1' }, isLoading: false, isError: false, error: null };
    }
    return { data: null, isLoading: false, isError: false, error: null };
  });

  mockImportGooglePlace.mockResolvedValue({
    id: 'place-1',
    name: 'Balboa Park',
  });

  mockUseMutation.mockImplementation((opts: { mutationFn: (id: string) => Promise<unknown>; onSuccess?: (data: any) => Promise<void> }) => ({
    mutate: async (googlePlaceId: string) => {
      if (importError) throw importError;
      const result = await opts.mutationFn(googlePlaceId);
      if (opts.onSuccess) await opts.onSuccess(result);
    },
    isPending: false,
    isError: Boolean(importError),
    error: importError ?? null,
  }));

  render(
    <GooglePlacePreviewScreen
      route={{ params: { googlePlaceId: 'google-1', initialName: 'Balboa Park' } }}
      navigation={{ navigate, setOptions: jest.fn() }}
    />
  );

  return { navigate, invalidateQueries };
}

describe('GooglePlacePreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders key preview data with Save action', async () => {
    setup();
    expect(await screen.findByText('Balboa Park')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Address')).toBeTruthy();
    expect(screen.getByText('Rating')).toBeTruthy();
    expect(screen.getByLabelText('Save place')).toBeTruthy();
  });

  it('imports only on explicit Save tap', async () => {
    const { navigate, invalidateQueries } = setup();
    expect(mockImportGooglePlace).not.toHaveBeenCalled();

    fireEvent.press(await screen.findByLabelText('Save place'));

    await waitFor(() => {
      expect(mockImportGooglePlace).toHaveBeenCalledWith('google-1');
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['places'] });
      expect(navigate).toHaveBeenCalledWith('PlaceDetail', { placeId: 'place-1' });
    });
  });
});
