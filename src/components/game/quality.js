// Device tier detection + per-tier graphics settings for the BACK2ROOM game.
// Desktop gets the full premium stack; mobile gets a scaled-down-but-smooth preset.

export const detectMobile = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 768);

// Returns "high" | "low". A coarse hardware sniff backs up the touch check so a
// touch-laptop still gets the full stack but a real phone is reliably "low".
export const getTier = () => {
  if (typeof window === "undefined") return "high";
  const mobile = detectMobile();
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (mobile) return "low";
  if (cores <= 4 && mem <= 4) return "low";
  return "high";
};

// Per-tier graphics settings consumed by BackroomsGame / Cutscene.
const SETTINGS = {
  high: {
    shadowMapSize: 2048,
    softShadows: true,
    ssao: true,
    bloom: true,
    bloomStrength: 0.8,
    fogDensity: 0.038,
    volumetric: true,
    textureScale: 1,
    pixelRatioCap: 2,
    grain: 1,
  },
  low: {
    shadowMapSize: 1024,
    softShadows: false,
    ssao: false,
    bloom: true,
    bloomStrength: 0.55,
    fogDensity: 0.05,
    volumetric: false,
    textureScale: 0.5,
    pixelRatioCap: 1.5,
    grain: 0.6,
  },
};

export const getQuality = (tier = getTier()) => ({
  tier,
  ...SETTINGS[tier],
});
