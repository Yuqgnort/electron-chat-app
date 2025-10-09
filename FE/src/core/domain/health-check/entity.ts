import { TTimeStamp } from "../type";

export interface IHealthCheckResult {
  timestamp: TTimeStamp;
  messagesTableCount: number;
  ftsTableCount: number;
  hasMismatch: boolean;
  mismatchDetails?: string;
}

export interface IHealthCheckAlert {
  timestamp: TTimeStamp;
  alertType: "MISMATCH_DETECTED" | "SYNC_ISSUE";
  message: string;
  details: {
    messagesTableCount: number;
    ftsTableCount: number;
    difference: number;
  };
}

export const createHealthCheckResult = (
  messagesTableCount: number,
  ftsTableCount: number
): IHealthCheckResult => {
  const hasMismatch = messagesTableCount !== ftsTableCount;
  const timestamp = new Date().getTime();

  return {
    timestamp,
    messagesTableCount,
    ftsTableCount,
    hasMismatch,
    mismatchDetails: hasMismatch
      ? `Messages table has ${messagesTableCount} records, FTS table has ${ftsTableCount} records. Difference: ${Math.abs(messagesTableCount - ftsTableCount)}`
      : undefined,
  };
};

export const createHealthCheckAlert = (
  healthCheckResult: IHealthCheckResult
): IHealthCheckAlert | null => {
  if (!healthCheckResult.hasMismatch) {
    return null;
  }

  const difference = Math.abs(
    healthCheckResult.messagesTableCount - healthCheckResult.ftsTableCount
  );

  return {
    timestamp: new Date().getTime(),
    alertType: "MISMATCH_DETECTED",
    message: `Health check detected mismatch between messages table and FTS table`,
    details: {
      messagesTableCount: healthCheckResult.messagesTableCount,
      ftsTableCount: healthCheckResult.ftsTableCount,
      difference,
    },
  };
};
