import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from "@pfram/design-tokens";
export function ScreenContainer({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = <View style={s.content}>{children}</View>;
  return (
    <SafeAreaView style={s.safe}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
export function AppButton({
  title,
  ...props
}: PressableProps & { title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [s.button, pressed && s.pressed]}
      {...props}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function AppTextInput({
  label,
  error,
  rightAccessory,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  rightAccessory?: ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrapper}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          style={[
            s.input,
            rightAccessory ? s.inputWithAccessory : undefined,
            error && s.inputError,
          ]}
          placeholderTextColor={colors.neutral}
          {...props}
        />
        {rightAccessory && (
          <View style={s.inputAccessory}>{rightAccessory}</View>
        )}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
function MobileEyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <View style={s.eyeIcon}>
      <View style={s.eyeOutline}>
        <View style={s.eyePupil} />
      </View>
      {crossed && <View style={s.eyeSlash} />}
    </View>
  );
}

export function PasswordInput(
  props: Omit<
    Parameters<typeof AppTextInput>[0],
    "secureTextEntry" | "rightAccessory"
  >,
) {
  const [visible, setVisible] = useState(false);
  const actionLabel = visible
    ? "Sembunyikan kata sandi"
    : "Tampilkan kata sandi";
  return (
    <AppTextInput
      {...props}
      secureTextEntry={!visible}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ expanded: visible }}
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          style={({ pressed }) => [s.eyeButton, pressed && s.pressed]}
        >
          <MobileEyeIcon crossed={visible} />
        </Pressable>
      }
    />
  );
}
export const AppCard = ({ children }: { children: ReactNode }) => (
  <View style={s.card}>{children}</View>
);
export const StatusBadge = ({ label }: { label: string }) => (
  <View style={s.badge}>
    <Text style={s.badgeText}>{label}</Text>
  </View>
);
export const LoadingState = () => (
  <View style={s.center}>
    <ActivityIndicator color={colors.primary} />
    <Text>Memuat…</Text>
  </View>
);
export const EmptyState = ({
  message = "Belum ada data.",
}: {
  message?: string;
}) => <Text style={s.muted}>{message}</Text>;
export const ErrorState = ({ message }: { message: string }) => (
  <Text accessibilityRole="alert" style={s.errorBox}>
    {message}
  </Text>
);
export const AppHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View>
    <Text accessibilityRole="header" style={s.title}>
      {title}
    </Text>
    {subtitle && <Text style={s.muted}>{subtitle}</Text>}
  </View>
);
export function ConsentCheckbox({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={s.checkbox}
    >
      <View style={[s.box, checked && s.boxChecked]}>
        <Text style={s.check}>{checked ? "✓" : ""}</Text>
      </View>
      <Text style={s.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}
export function ChoiceSelect({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value?: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={s.choices}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[s.choice, value === option.value && s.choiceSelected]}
          >
            <Text
              style={
                value === option.value ? s.choiceTextSelected : s.choiceText
              }
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  button: {
    minHeight: minimumTouchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  field: { gap: 6 },
  label: { fontWeight: "600", color: colors.text },
  inputWrapper: { position: "relative" },
  input: {
    minHeight: minimumTouchTarget,
    borderWidth: 1,
    borderColor: "#C7D8D2",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    color: "#173B31",
  },
  inputWithAccessory: { paddingRight: 56 },
  inputAccessory: {
    position: "absolute",
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeButton: {
    width: minimumTouchTarget,
    height: minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  eyeIcon: {
    width: 28,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeOutline: {
    width: 24,
    height: 15,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eyePupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  eyeSlash: {
    position: "absolute",
    width: 29,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.text,
    transform: [{ rotate: "-45deg" }],
  },
  inputError: { borderColor: colors.emergency },
  error: { color: colors.emergency },
  errorBox: {
    color: colors.emergency,
    backgroundColor: "#FFF0EF",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DDF3EC",
  },
  badgeText: { color: colors.text, fontWeight: "700" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  muted: { color: "#586B65", lineHeight: 22 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: minimumTouchTarget,
  },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: colors.primary },
  check: { color: colors.white, fontWeight: "700" },
  checkboxLabel: { flex: 1, color: colors.text },
  choices: { gap: spacing.sm },
  choice: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D8D2",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: "#DDF3EC" },
  choiceText: { color: "#173B31" },
  choiceTextSelected: { color: colors.text, fontWeight: "700" },
});
