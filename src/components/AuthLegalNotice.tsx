import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { colors } from '@/theme';

export function AuthLegalNotice() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <Text style={styles.text}>
      By continuing, you agree to the{' '}
      <Text
        onPress={() => navigation.navigate('LegalDocument', { documentType: 'terms' })}
        style={styles.link}
      >
        Terms
      </Text>{' '}
      and{' '}
      <Text
        onPress={() => navigation.navigate('LegalDocument', { documentType: 'communityGuidelines' })}
        style={styles.link}
      >
        Community Guidelines
      </Text>{' '}
      and acknowledge the{' '}
      <Text
        onPress={() => navigation.navigate('LegalDocument', { documentType: 'privacyPolicy' })}
        style={styles.link}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  link: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
