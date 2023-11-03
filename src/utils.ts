import { TimeRange } from '@grafana/data';
import { Tuple } from './types';

export function getRange(range: TimeRange): Tuple<number> {
  const timeFrom = range.from.valueOf();
  const timeTo = range.to.valueOf();
  return [timeFrom, timeTo];
}

export function stringifyError(error: any) {
  const { data, status } = error;
  const missing = data?.error?.missing && data?.error?.missing.map(JSON.stringify);
  const missingStr = missing ? `\nMissing: ${missing}` : '';
  const errorMessage = missingStr || data?.error?.message || error.message;
  const errorCode = status ? `${status} ` : '';
  return errorMessage ? `[${errorCode}ERROR] ${errorMessage}` : `Unknown error`;
}

export function stringifyDataError(error: any) {
  let errorMessage: string;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    errorMessage = error.message ?? 'Unknown error';
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = 'Unknown error';
  }
  return errorMessage;
}
