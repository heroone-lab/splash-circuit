// Six original environment themes: palette, materials, balanced lighting,
// water, props and audio style. Obstacles use high-contrast hazard palettes
// so they stay readable without raising global brightness.
// Material: [colour, pattern, patColour, patScale, roughness, emissive]
// patterns: 0 plain 1 stripes 2 planks 3 tiles 4 natural 5 belt 6 fabric 8 stone 9 foliage 10 ball-rings
const M = (color, pattern = 0, patColor = 0xffffff, patScale = 1, rough = 0.7, emissive = 0) => ({ color, pattern, patColor, patScale, rough, emissive });

const BASE_LIGHT = {
  sunIntensity: 2.25, hemiIntensity: 0.85, exposure: 0.86, saturation: 0.94,
  fillColor: 0x505662, plColor: 0x5a5046, plRange: 9, fogDensity: 0.0085, fogStart: 24,
};

export const THEMES = {
  Default: {
    name: 'Default', label: 'Splash Arena',
    light: { ...BASE_LIGHT, skyTop: 0x4F7FB8, skyHorizon: 0xB9CCDF, sunColor: 0xFFF1DC, sunDir: [-0.35, 0.78, 0.5], hemiSky: 0x9DB8D8, hemiGround: 0x5B5448, fogColor: 0xB5C7D8 },
    water: { deep: 0x1B4A66, shallow: 0x2E7C98 },
    ground: 0x3E5A48,
    mats: {
      deck: M(0x3C79B8, 3, 0x6A9BD0, 1.0, 0.6), deckAlt: M(0x2F5E8E, 3, 0x4C7AAA, 1.0, 0.65), pontoon: M(0x2B3E57, 4, 0, 1, 0.8), trim: M(0xF2C230, 0, 0, 1, 0.5, 0.05),
      hazard: M(0xD9432F, 1, 0xF1F1F1, 2, 0.55, 0.06), hazardAlt: M(0xF2C230, 0, 0, 1, 0.5, 0.04), pad: M(0xE2562F, 1, 0xF4F4F4, 3, 0.7, 0.06),
      metal: M(0x9AA3AD, 0, 0, 1, 0.35), frame: M(0x4A5563, 0, 0, 1, 0.5), rubber: M(0xE04836, 0, 0, 1, 0.45, 0.05),
      ball: M(0xF08A24, 10, 0xF4F0E6, 1, 0.5, 0.05), belt: M(0x3A3A3A, 5, 0x8A8A8A, 2, 0.8), tramp: M(0x1F9BD1, 0, 0, 1, 0.6, 0.05), trampFrame: M(0x2F3338, 0, 0, 1, 0.4),
      sign: M(0xF4F1EA, 0, 0, 1, 0.6), arrow: M(0x2F9E5B, 0, 0, 1, 0.5, 0.25), gate: M(0x2FA36B, 0, 0, 1, 0.5, 0.15), finish: M(0xE9E9E9, 3, 0x222222, 2.5, 0.6),
    },
    props: 'arena', music: { tempo: 118, root: 45, scale: [0, 2, 4, 7, 9], wave: 'triangle', drums: 'sport' }, ambience: 'crowd',
  },
  Pirate: {
    name: 'Pirate', label: "Buccaneer's Cove",
    light: { ...BASE_LIGHT, skyTop: 0x5A8CC0, skyHorizon: 0xD7CFBD, sunColor: 0xFFE6C4, sunDir: [0.3, 0.72, 0.55], hemiSky: 0xA8BCD0, hemiGround: 0x5E4E3A, fogColor: 0xCFC8B8 },
    water: { deep: 0x174858, shallow: 0x2A7A82 },
    ground: 0xC8B28A,
    mats: {
      deck: M(0x8A6440, 2, 0, 1, 0.75), deckAlt: M(0x6E4E32, 2, 0, 1, 0.8), pontoon: M(0x5A3F28, 2, 0, 0.7, 0.85), trim: M(0xD6B25E, 0, 0, 1, 0.45, 0.04),
      hazard: M(0xB3322A, 1, 0xEDE3CF, 2, 0.6, 0.06), hazardAlt: M(0xD6B25E, 0, 0, 1, 0.45), pad: M(0xB3322A, 1, 0xEDE3CF, 3, 0.75, 0.06),
      metal: M(0x77736B, 0, 0, 1, 0.45), frame: M(0x4B3522, 2, 0, 1.5, 0.8), rubber: M(0xC4412F, 0, 0, 1, 0.5, 0.05),
      ball: M(0x6E737A, 10, 0xB9B4A6, 1, 0.4, 0.04), belt: M(0x3B2E22, 5, 0x7A6448, 2, 0.85), tramp: M(0xE6DCC3, 6, 0, 1, 0.8), trampFrame: M(0x4B3522, 2, 0, 1, 0.8),
      sign: M(0xE6DCC3, 0, 0, 1, 0.7), arrow: M(0xB3322A, 0, 0, 1, 0.5, 0.2), gate: M(0xD6B25E, 0, 0, 1, 0.5, 0.15), finish: M(0xEDE3CF, 3, 0x2A2A2A, 2.5, 0.7),
    },
    props: 'pirate', music: { tempo: 128, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], wave: 'square', drums: 'shanty', swing: 0.18 }, ambience: 'sea',
  },
  Fastfood: {
    name: 'Fastfood', label: 'Burger Boardwalk',
    light: { ...BASE_LIGHT, exposure: 0.72, skyTop: 0x5F96C8, skyHorizon: 0xD9CCB4, sunColor: 0xFFF0D8, sunDir: [-0.2, 0.8, 0.55], hemiSky: 0xB4C8DA, hemiGround: 0x6A5040, fogColor: 0xE6DAC6 },
    water: { deep: 0x245A76, shallow: 0x3A8AA0 },
    ground: 0xB8955E,
    mats: {
      deck: M(0xCFA54C, 3, 0xDDB96A, 1.4, 0.6), deckAlt: M(0xB88A3C, 3, 0xC99E52, 1.4, 0.65), pontoon: M(0xA8452F, 4, 0, 1, 0.75), trim: M(0xF7F4EC, 0, 0, 1, 0.5, 0.04),
      hazard: M(0xD93A3A, 1, 0xFFF3D6, 2, 0.5, 0.06), hazardAlt: M(0x2A9D8F, 0, 0, 1, 0.5, 0.04), pad: M(0xE8773A, 1, 0xFFF3D6, 3, 0.65, 0.06),
      metal: M(0xC9CED3, 0, 0, 1, 0.3), frame: M(0xB23A3A, 0, 0, 1, 0.5), rubber: M(0xD93A3A, 0, 0, 1, 0.45, 0.05),
      ball: M(0x9C5A2E, 10, 0xE9C27A, 1, 0.7, 0.04), belt: M(0x444444, 5, 0x9A9A9A, 2, 0.75), tramp: M(0x2A9D8F, 0, 0, 1, 0.6, 0.05), trampFrame: M(0xF7F4EC, 0, 0, 1, 0.4),
      sign: M(0xFFF6E0, 0, 0, 1, 0.6), arrow: M(0xD93A3A, 0, 0, 1, 0.5, 0.2), gate: M(0x2A9D8F, 0, 0, 1, 0.5, 0.15), finish: M(0xFFF6E0, 3, 0xD93A3A, 2.5, 0.6),
    },
    props: 'fastfood', music: { tempo: 124, root: 43, scale: [0, 3, 5, 7, 10], wave: 'sawtooth', drums: 'funk' }, ambience: 'boardwalk',
  },
  Medieval: {
    name: 'Medieval', label: 'Castle Moat',
    light: { ...BASE_LIGHT, sunIntensity: 2.1, hemiIntensity: 0.95, skyTop: 0x7C9CB8, skyHorizon: 0xD0D3CE, sunColor: 0xF4E9D8, sunDir: [0.35, 0.7, 0.55], hemiSky: 0xAFBFCC, hemiGround: 0x5A5548, fogColor: 0xC6CAC6 },
    water: { deep: 0x234650, shallow: 0x386A6C },
    ground: 0x5E7A45,
    mats: {
      deck: M(0x9C958A, 8, 0, 1.2, 0.85), deckAlt: M(0x857E73, 8, 0, 1.2, 0.85), pontoon: M(0x6D675E, 8, 0, 1, 0.9), trim: M(0xC9A640, 0, 0, 1, 0.45, 0.05),
      hazard: M(0x8E2F2F, 1, 0xDCCFA8, 2, 0.6, 0.07), hazardAlt: M(0xC9A640, 0, 0, 1, 0.45), pad: M(0x8E2F2F, 1, 0xDCCFA8, 3, 0.75, 0.07),
      metal: M(0x7C7F84, 0, 0, 1, 0.4), frame: M(0x5B4330, 2, 0, 1.5, 0.8), rubber: M(0x9A3434, 0, 0, 1, 0.5, 0.05),
      ball: M(0xA39B8E, 10, 0x6A635A, 1, 0.85, 0.03), belt: M(0x3E3A36, 5, 0x7C766E, 2, 0.85), tramp: M(0x8C6D3F, 6, 0, 1, 0.8), trampFrame: M(0x5B4330, 2, 0, 1, 0.8),
      sign: M(0xDCCFA8, 0, 0, 1, 0.7), arrow: M(0x8E2F2F, 0, 0, 1, 0.5, 0.2), gate: M(0xC9A640, 0, 0, 1, 0.5, 0.15), finish: M(0xDCCFA8, 3, 0x3A2E2E, 2.5, 0.7),
    },
    props: 'medieval', music: { tempo: 112, root: 48, scale: [0, 2, 3, 5, 7, 9, 10], wave: 'triangle', drums: 'march' }, ambience: 'wind',
  },
  Tiki: {
    name: 'Tiki', label: 'Tiki Lagoon',
    light: { ...BASE_LIGHT, exposure: 0.78, skyTop: 0x3A7CBC, skyHorizon: 0xD8C6A6, sunColor: 0xFFE4BE, sunDir: [-0.28, 0.68, 0.6], hemiSky: 0x9CC0DA, hemiGround: 0x6A5A40, fogColor: 0xE0D2B8 },
    water: { deep: 0x12607A, shallow: 0x2A98A6 },
    ground: 0xC4A874,
    mats: {
      deck: M(0xC8A165, 2, 0, 1, 0.7), deckAlt: M(0xA88348, 2, 0, 1, 0.75), pontoon: M(0x7A5A36, 2, 0, 0.7, 0.8), trim: M(0x2BB3A3, 0, 0, 1, 0.5, 0.06),
      hazard: M(0xE0662F, 1, 0xF6E7C1, 2, 0.55, 0.06), hazardAlt: M(0x2BB3A3, 0, 0, 1, 0.5, 0.05), pad: M(0xE0662F, 1, 0xF6E7C1, 3, 0.7, 0.06),
      metal: M(0x8E7B5C, 2, 0, 2, 0.7), frame: M(0x6B4A2B, 2, 0, 1.5, 0.8), rubber: M(0xD1492E, 0, 0, 1, 0.5, 0.05),
      ball: M(0x8A6A45, 10, 0xE8D9A8, 1, 0.8, 0.04), belt: M(0x4A3B2A, 5, 0x9A7E58, 2, 0.85), tramp: M(0x2BB3A3, 6, 0, 1, 0.7, 0.05), trampFrame: M(0x6B4A2B, 2, 0, 1, 0.8),
      sign: M(0xF6E7C1, 0, 0, 1, 0.7), arrow: M(0xE0662F, 0, 0, 1, 0.5, 0.2), gate: M(0x2BB3A3, 0, 0, 1, 0.5, 0.15), finish: M(0xF6E7C1, 3, 0x6B4A2B, 2.5, 0.7),
    },
    props: 'tiki', music: { tempo: 116, root: 52, scale: [0, 2, 4, 7, 9], wave: 'sine', drums: 'tiki' }, ambience: 'lagoon',
  },
  Forest: {
    name: 'Forest', label: 'Timberline Lake',
    light: { ...BASE_LIGHT, sunIntensity: 2.2, skyTop: 0x6891B3, skyHorizon: 0xC8D5CB, sunColor: 0xFFF0D6, sunDir: [0.25, 0.75, 0.55], hemiSky: 0xA6BDB8, hemiGround: 0x4A5A3A, fogColor: 0xBCCABE },
    water: { deep: 0x1D4644, shallow: 0x2E6A60 },
    ground: 0x4F6B3A,
    mats: {
      deck: M(0x86724F, 2, 0, 1, 0.8), deckAlt: M(0x6E5D40, 2, 0, 1, 0.85), pontoon: M(0x4F4232, 2, 0, 0.7, 0.9), trim: M(0xD9C27A, 0, 0, 1, 0.5, 0.05),
      hazard: M(0xC2502B, 1, 0xEFE6D0, 2, 0.6, 0.07), hazardAlt: M(0xD9C27A, 0, 0, 1, 0.5), pad: M(0xC2502B, 1, 0xEFE6D0, 3, 0.7, 0.07),
      metal: M(0x80786A, 0, 0, 1, 0.45), frame: M(0x4B3A28, 2, 0, 1.5, 0.85), rubber: M(0xB8452A, 0, 0, 1, 0.5, 0.05),
      ball: M(0xA89370, 10, 0x5B4B35, 1, 0.85, 0.04), belt: M(0x3D342A, 5, 0x857358, 2, 0.85), tramp: M(0x5E8C4A, 6, 0, 1, 0.75, 0.05), trampFrame: M(0x4B3A28, 2, 0, 1, 0.85),
      sign: M(0xEFE6D0, 0, 0, 1, 0.7), arrow: M(0xC2502B, 0, 0, 1, 0.5, 0.2), gate: M(0xD9C27A, 0, 0, 1, 0.5, 0.15), finish: M(0xEFE6D0, 3, 0x3D342A, 2.5, 0.7),
    },
    props: 'forest', music: { tempo: 104, root: 47, scale: [0, 2, 4, 5, 7, 9, 11], wave: 'sine', drums: 'soft' }, ambience: 'forest',
  },
};
