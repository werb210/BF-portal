export const useVirtualizer = () => ({
  getVirtualItems: () => [
    { index: 0, start: 0, size: 100, key: "0" },
    { index: 1, start: 100, size: 100, key: "1" }
  ],
  getTotalSize: () => 200,
  scrollToIndex: () => {},
  measureElement: () => {}
});
