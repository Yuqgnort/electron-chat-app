export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[AppService Error][${context}]`, error);
      throw error;
    }
  }) as (...args: Parameters<T>) => ReturnType<T>;
}

export function assertExists<T>(
  value: T | null | undefined,
  errorMessage: string
): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}
