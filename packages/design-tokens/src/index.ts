export const colors = {
  primary: "#168C68",
  teal: "#42B8A5",
  pink: "#F3A6B8",
  cream: "#FFF8F2",
  text: "#155E4B",
  white: "#FFFFFF",
  safe: "#2E9B68",
  attention: "#F2B84B",
  emergency: "#D9544D",
  info: "#3E8EC9",
  neutral: "#7A8490",
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export const typography = {
  fontFamily: "system-ui",
  sizes: { sm: 14, md: 16, lg: 20, xl: 28, xxl: 36 },
  weights: { regular: 400, medium: 500, bold: 700 },
} as const;
export const shadows = {
  card: { color: "#155E4B", opacity: 0.1, radius: 12, offsetY: 4 },
} as const;
export const status = {
  safe: { color: colors.safe, label: "Aman" },
  attention: { color: colors.attention, label: "Perhatian" },
  emergency: { color: colors.emergency, label: "Darurat" },
  info: { color: colors.info, label: "Informasi" },
  neutral: { color: colors.neutral, label: "Netral" },
} as const;
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
export const minimumTouchTarget = 44;
