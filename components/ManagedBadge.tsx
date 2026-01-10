import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { cn } from '@/lib/cn';

export function ManagedBadge({ isManaged }: { isManaged: boolean }) {
    return (
        <View className={cn(
            "px-2 py-0.5 rounded-full",
            isManaged ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"
        )}>
            <Text
                className={cn(
                    "text-[10px] font-bold",
                    isManaged ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400"
                )}
            >
                {isManaged ? 'MANAGED' : 'EXTERNAL'}
            </Text>
        </View>
    );
}
