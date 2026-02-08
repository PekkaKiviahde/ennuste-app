export const isDemoModeEnabled = () => process.env.DEMO_MODE === "true";

export const isDemoQuickLoginEnabled = () =>
  isDemoModeEnabled() && process.env.SHOW_DEMO_USERS === "true" && process.env.NODE_ENV !== "production";

