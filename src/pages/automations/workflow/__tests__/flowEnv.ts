// BF_PORTAL_v786_WORKFLOW_BUILDER - jsdom lacks the layout APIs React Flow measures with.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const g = globalThis as Record<string, unknown>;
g.ResizeObserver = ResizeObserverStub;
if (!g.DOMMatrixReadOnly) {
  g.DOMMatrixReadOnly = class { m22: number; constructor(t?: string) { const scale = t?.match(/scale\(([1-9.])\)/)?.[1]; this.m22 = scale !== undefined ? +scale : 1; } };
}
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get() { return parseFloat((this as HTMLElement).style.height) || 100; } },
  offsetWidth: { configurable: true, get() { return parseFloat((this as HTMLElement).style.width) || 300; } },
});
(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
export {};
