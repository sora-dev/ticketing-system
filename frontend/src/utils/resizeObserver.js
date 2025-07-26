export const createDebouncedResizeObserver = (callback, delay = 100) => {
  let timeoutId;
  
  return new ResizeObserver((entries) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(entries);
    }, delay);
  });
};