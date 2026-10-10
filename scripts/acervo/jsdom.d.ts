declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string);
    window: Record<string, unknown>;
  }
}
