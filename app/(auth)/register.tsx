import * as React from 'react';
import { View, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/nativewindui/Button';
import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/lib/useColorScheme';

export default function RegisterScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useColorScheme();
    const { register, isLoading, error, clearError } = useAuth();

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [localError, setLocalError] = React.useState('');

    const handleRegister = async () => {
        if (!username.trim() || !password) {
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('Password tidak sama');
            return;
        }
        if (password.length < 6) {
            setLocalError('Password minimal 6 karakter');
            return;
        }
        setLocalError('');
        const success = await register(username.trim(), password);
        if (success) {
            router.replace('/(tabs)/dashboard');
        }
    };

    React.useEffect(() => {
        clearError();
        setLocalError('');
    }, [username, password, confirmPassword]);

    const displayError = localError || error;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
            style={{ paddingTop: insets.top }}
        >
            <View className="flex-1 justify-center px-6">
                {/* Header */}
                <View className="mb-12 items-center">
                    <Text variant="largeTitle" className="font-bold text-primary mb-2">
                        Daftar Akun
                    </Text>
                    <Text variant="subhead" color="tertiary">
                        Buat akun baru untuk memulai
                    </Text>
                </View>

                {/* Form */}
                <View className="gap-4">
                    <View>
                        <Text variant="footnote" className="mb-2 ml-1 text-muted-foreground">
                            Username
                        </Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Pilih username"
                            placeholderTextColor={colors.grey}
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                            style={{ color: colors.foreground }}
                        />
                    </View>

                    <View>
                        <Text variant="footnote" className="mb-2 ml-1 text-muted-foreground">
                            Password
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Minimal 6 karakter"
                            placeholderTextColor={colors.grey}
                            secureTextEntry
                            className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                            style={{ color: colors.foreground }}
                        />
                    </View>

                    <View>
                        <Text variant="footnote" className="mb-2 ml-1 text-muted-foreground">
                            Konfirmasi Password
                        </Text>
                        <TextInput
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Ulangi password"
                            placeholderTextColor={colors.grey}
                            secureTextEntry
                            className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                            style={{ color: colors.foreground }}
                        />
                    </View>

                    {displayError && (
                        <View className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                            <Text className="text-destructive text-sm">{displayError}</Text>
                        </View>
                    )}

                    <Button
                        onPress={handleRegister}
                        disabled={isLoading || !username.trim() || !password || !confirmPassword}
                        className="mt-4"
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-semibold">Daftar</Text>
                        )}
                    </Button>
                </View>

                {/* Login Link */}
                <View className="flex-row justify-center mt-8">
                    <Text color="tertiary">Sudah punya akun? </Text>
                    <Link href="/(auth)/login" asChild>
                        <Pressable>
                            <Text className="text-primary font-semibold">Login</Text>
                        </Pressable>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
