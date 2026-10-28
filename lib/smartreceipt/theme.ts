export const palette = {
  bg: "#111315",
  bgSoft: "#171A1D",
  surface: "#1D2124",
  surfaceRaised: "#252A2E",
  paper: "#F4EFE6",
  paperMuted: "#D9D2C5",
  ink: "#16181A",
  text: "#F4F1EB",
  textMuted: "#98A0A5",
  textFaint: "#687176",
  border: "#30363A",
  amber: "#F4B860",
  amberSoft: "#3A2E1D",
  emerald: "#66C49A",
  emeraldSoft: "#1F352D",
  red: "#F27878",
  redSoft: "#3B2527",
  blue: "#75A9D6",
  blueSoft: "#22313E",
  white: "#FFFFFF",
};

export const spacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32 };

export const redact = (value: string, privacyMode: boolean) => privacyMode ? "••••••" : value;

export const redactMoney = (value: string, privacyMode: boolean) => privacyMode ? "••••" : value;

export const statusTone = (status: string) => {
  if (["verified", "reviewed", "valid", "passed"].includes(status)) return { bg: palette.emeraldSoft, fg: palette.emerald };
  if (["flagged", "open", "warning", "unresolved"].includes(status)) return { bg: palette.amberSoft, fg: palette.amber };
  if (["failed", "high"].includes(status)) return { bg: palette.redSoft, fg: palette.red };
  return { bg: palette.blueSoft, fg: palette.blue };
};
