import { TimeRange } from '@grafana/data';
import {Range, Tuple} from './types';

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

export function splitRange(timeFrame: [start: number, end: number]): Range[] {
  const start = timeFrame[0];
  const end = timeFrame[1];
  const startDate = new Date(start);
  const endDate = new Date(end);

  const oneDay = 24 * 60 * 60 * 1000; // ms in one day
  const difference = endDate.getTime() - startDate.getTime();

  let ranges = [];

  // check if period is bigger than 24
  if (difference > oneDay) {
    const end2Timestamp = endDate.getTime() - oneDay;
    const start2Timestamp = end2Timestamp;

    ranges = [
      {start, end: end2Timestamp, precomputed: true},
      {start: start2Timestamp, end}
    ]

  } else {
    ranges = [{start, end}];
  }

  return ranges;
}
