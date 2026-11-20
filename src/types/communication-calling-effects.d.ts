// BF_PORTAL_TEAMS_BLUR_v1 - the package ships types but its "exports" map hides them from TypeScript's resolver.
declare module "@azure/communication-calling-effects" {
  export class BackgroundBlurEffect {
    constructor(config?: Record<string, unknown>);
    readonly name: string;
  }
  export class BackgroundReplacementEffect {
    constructor(config: { backgroundImageUrl: string });
    readonly name: string;
  }
}
