export function createAsyncActionGuard() {
  const runningKeys = new Set();

  return {
    isRunning(key) {
      return runningKeys.has(key);
    },

    async run(key, task, duplicateResult = undefined) {
      if (runningKeys.has(key)) {
        return duplicateResult;
      }

      runningKeys.add(key);
      try {
        return await task();
      } finally {
        runningKeys.delete(key);
      }
    },
  };
}
