import { EventBusSrv, BusEventWithPayload } from '@grafana/data';
import {stringifyError} from './utils';
import {QueryRequestError} from './types';

export const eventBusService = new EventBusSrv();

export const FAILED_ERROR_TYPE = 'failed-request';
export class FailedResponseEvent extends BusEventWithPayload<QueryRequestError> {
  static type = FAILED_ERROR_TYPE;
}
type EventClass<T> = new (payload: T) => BusEventWithPayload<T>;

function publishEvent<T>(EventClassType: EventClass<T>, payload: T) {
  const eventInstance = new EventClassType(payload);
  eventBusService.publish(eventInstance);
}

export function handleError(error: any, refId: string, requestId: string) {
  const errMessage = stringifyError(error);
  publishEvent(FailedResponseEvent, { refId, requestId, error: errMessage });
}
