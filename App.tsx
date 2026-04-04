import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Linking, View, StyleSheet, Text, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ScrollDirectionProvider } from '@/context/ScrollDirectionContext';
import { colors } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { isAuthCallbackUrl } from '@/api/auth';

type ComponentWithDefaultStyle = {
  defaultProps?: { style?: unknown };
};

const defaultFontFamily =
  Platform.OS === 'web' ? "'Inter', sans-serif" : 'Inter_400Regular';
const defaultLetterSpacing = -0.12;

function applyGlobalDefaultFont() {
  const textDefaultStyle = {
    fontFamily: defaultFontFamily,
    letterSpacing: defaultLetterSpacing,
  };
  const applyStyle = (component: ComponentWithDefaultStyle) => {
    const currentDefaultStyle = component.defaultProps?.style;
    component.defaultProps = {
      ...component.defaultProps,
      style: StyleSheet.flatten([currentDefaultStyle, textDefaultStyle]),
    };
  };

  applyStyle(Text as unknown as ComponentWithDefaultStyle);
  applyStyle(TextInput as unknown as ComponentWithDefaultStyle);
}

function parseAuthParamsFromUrl(url: string): { access_token?: string; refresh_token?: string } {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
  const hash = url.slice(hashIndex + 1);
  const params: Record<string, string> = {};
  hash.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
  });
  return {
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  };
}

function handleAuthUrl(url: string) {
  if (!isAuthCallbackUrl(url)) return;
  const { access_token, refresh_token } = parseAuthParamsFromUrl(url);
  if (access_token && refresh_token) {
    supabase.auth.setSession({ access_token, refresh_token }).then(({ data }) => {
      useAuthStore.getState().setSession(data.session);
    });
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) applyGlobalDefaultFont();
  }, [fontsLoaded]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ScrollDirectionProvider>
          <View style={styles.root}>
            <RootNavigator />
          </View>
        </ScrollDirectionProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
