export const assertDemoModeSafe = () => {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true") {
    throw new Error("DEMO_MODE ei ole sallittu tuotannossa");
  }
};
