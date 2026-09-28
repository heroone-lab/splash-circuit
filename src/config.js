// Central, editable gameplay configuration shared by Web and Android.
// All baseline values requested by the design brief live here.
export const CONFIG = {
  sim: { fixedDt: 1 / 120, maxSubSteps: 12 },

  physics: {
    backwardSpeed: 2,
    walkSpeed: 4,
    runSpeed: 6,
    jumpImpulse: 10,
    gravity: -20,
    maxVelocity: 14,
    // Air-control reaction value from the brief (≈5). Used as the air
    // responsiveness rate (1/s): vx approaches target by (1-exp(-5·dt)).
    airControlReaction: 5,
    groundAccel: 32,
    groundDecel: 26,
    halfWidth: 0.24,
    height: 1.78,
    slideHeight: 0.9,
    stepHeight: 0.32,
    coyoteTime: 0.1,
    jumpBuffer: 0.14,
    waterLevel: -1.1,
    killY: -6,
  },

  slide: {
    friction: 0.9,     // normal slide friction (speed retained per 0.25 s)
    downhill: 1.25,    // slope multiplier downhill
    uphill: 0.75,      // slope multiplier uphill
    duration: 0.8,
    minSpeed: 1.5,
    entryBoost: 1.08,
  },

  camera: {
    floorHeightLimit: 4.5,
    shakeDuration: 0.15,
    shakeMax: 0.1,
    shakeMin: 0.001,
    wipeoutTransition: 2,
    distance: 9.0,
    minHalfWidth: 6.6,     // world metres visible each side (keeps next obstacle visible)
    height: 1.35,
    lookAhead: 2.8,
    fov: 42,
    followX: 7,
    followY: 3.2,
    wipeoutDistance: 7.2,
  },

  touch: {
    jumpSwipe: 0.05,        // fraction of screen dimension
    slideSwipe: 0.05,
    controlArea: 0.40,      // left fraction of screen used for movement
    moveThreshold: 0.08,
    backThreshold: 0.08,
    tapJumpDelay: 0.1,
    walkStartupDelay: 0.05,
  },

  bigBall: { minBounceForce: 5, bounceAngle: 60, verticalDamping: 1, horizontalDamping: 1, restitution: 0.5 },
  trampoline: { minBounceRatio: 0.6, maxBounceRatio: 1.0, damping: 1, minBouncingVelocity: 1, maxBouncingVelocity: 1, baseLaunch: 11.5 },
  conveyor: { speed: 2 },
  impact: { small: 7, medium: 13, cooldown: 0.6, stumbleTime: 0.45 },
  ragdoll: { blend: 0.5, iterations: 6, settleSpeed: 0.6, maxTime: 3.2, minTime: 1.3 },
  wipeout: { penalty: 5, recovery: 1, stuckTimeout: 5 },
  slowmo: { factor: 0.5, fadeIn: 1, duration: 1, fadeOut: 0.5 },

  powerups: {
    energySpeedMul: 1.5, energyDuration: 4,
    rewindSeconds: 3, rewindPlayback: 0.6, rewindCharges: 2,
    teleportCharges: 2,
  },

  ghost: { sampleRate: 30, opacity: 0.33 },

  course: { startLength: 5, spawnX: -1.5, connectorLength: 1.2, endLength: 9, finishOffset: 0.8, laneHalfDepth: 1.4, countdown: 3 },
};

export const QUALITY = {
  low:    { pixelRatio: 1.0, shadowSize: 0,    pcf: 0, particles: 70,  waterRes: 12, waterWaves: false, reflections: 0.15, propDensity: 0.45, textureDetail: 0, lodBias: 0.5, sphereSeg: 10, clouds: false },
  medium: { pixelRatio: 1.5, shadowSize: 1024, pcf: 1, particles: 160, waterRes: 40, waterWaves: true,  reflections: 0.3,  propDensity: 0.75, textureDetail: 1, lodBias: 1,   sphereSeg: 16, clouds: true },
  high:   { pixelRatio: 2.0, shadowSize: 2048, pcf: 2, particles: 320, waterRes: 80, waterWaves: true,  reflections: 0.42, propDensity: 1.0,  textureDetail: 2, lodBias: 1.5, sphereSeg: 24, clouds: true },
};
