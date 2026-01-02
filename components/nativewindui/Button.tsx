import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable, PressableProps, View, ViewStyle } from 'react-native';

import { TextClassContext } from '@/components/nativewindui/Text';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';
import { withOpacity } from '@/theme/with-opacity';

const buttonVariants = cva('flex-row items-center justify-center gap-2', {
  variants: {
    variant: {
      primary: 'ios:active:opacity-80 bg-primary',
      secondary: 'ios:active:opacity-80 bg-zinc-200 dark:bg-zinc-700',
      tonal:
        'ios:active:opacity-80 bg-zinc-200 dark:bg-zinc-700',
      plain: 'ios:active:opacity-70',
    },
    size: {
      none: '',
      sm: 'py-1 px-2.5 rounded-full',
      md: 'ios:rounded-lg py-2 ios:py-1.5 ios:px-3.5 px-5 rounded-full',
      lg: 'py-2.5 px-5 ios:py-2 rounded-xl gap-2',
      icon: 'ios:rounded-lg h-10 w-10 rounded-full',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const androidRootVariants = cva('', {
  variants: {
    size: {
      none: '',
      icon: 'rounded-full',
      sm: 'rounded-full',
      md: 'rounded-full',
      lg: 'rounded-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const buttonTextVariants = cva('font-medium', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-zinc-900 dark:text-zinc-100',
      tonal: 'text-zinc-900 dark:text-zinc-100',
      plain: 'text-foreground',
    },
    size: {
      none: '',
      icon: '',
      sm: 'text-[15px] leading-5',
      md: 'text-[17px] leading-7',
      lg: 'text-[17px] leading-7',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const ANDROID_RIPPLE = {
  dark: {
    primary: { color: withOpacity(COLORS.dark.grey3, 0.4), borderless: false },
    secondary: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
    plain: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
    tonal: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
  },
  light: {
    primary: { color: withOpacity(COLORS.light.grey4, 0.4), borderless: false },
    secondary: { color: withOpacity(COLORS.light.grey5, 0.4), borderless: false },
    plain: { color: withOpacity(COLORS.light.grey5, 0.4), borderless: false },
    tonal: { color: withOpacity(COLORS.light.grey6, 0.4), borderless: false },
  },
};

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
const BORDER_CURVE: ViewStyle = {
  borderCurve: 'continuous',
};

type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, 'variant'> & {
  variant?: Exclude<VariantProps<typeof buttonVariants>['variant'], null>;
};

type AndroidOnlyButtonProps = {
  /**
   * ANDROID ONLY: The class name of root responsible for hidding the ripple overflow.
   */
  androidRootClassName?: string;
};

type ButtonProps = PressableProps & ButtonVariantProps & AndroidOnlyButtonProps;

const Root = Platform.OS === 'android' ? View : Slot.Pressable;

function Button({
  className,
  variant = 'primary',
  size,
  style = BORDER_CURVE,
  androidRootClassName,
  ...props
}: ButtonProps) {
  const { colorScheme } = useColorScheme();

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Root
        className={Platform.select({
          ios: undefined,
          default: androidRootVariants({
            size,
            className: androidRootClassName,
          }),
        })}>
        <Pressable
          className={cn(
            props.disabled && 'opacity-50',
            buttonVariants({ variant, size, className })
          )}
          style={style}
          android_ripple={ANDROID_RIPPLE[colorScheme][variant]}
          {...props}
        />
      </Root>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
