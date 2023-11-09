import {ChangeEvent} from 'react';
import {
  DataSourceJsonData,
  DataQueryRequest,
  QueryEditorProps,
  SelectableValue
} from '@grafana/data';

import {
  DataQuery,
} from '@grafana/schema';

import { DataSource } from './datasource';

export enum AggregatesType {
  AVERAGE = 'average',
  MAX = 'max',
  MIN = 'min',
  SUM = 'sum',
  COUNT = 'count',
  INTERPOLATION = 'interpolation',
}

// data source config options
export interface MyDataSourceOptions extends DataSourceJsonData {
  apiURL?: string;
  authDomain?: string;
}

// secure data source config options - values used in the backend, but never sent over HTTP to the frontend
export interface MySecureDataSourceOptions {
  clientId?: string;
  clientSecret?: string;
}

export interface DataSourceConnectionOptions extends MyDataSourceOptions, MySecureDataSourceOptions {
}

export const defaultMyDataSourceOptions = {
  apiURL: 'https://api.hagal.com/api/v1',
  authDomain: ''
};

// query interface options
export interface TimeSeriesQuery extends DataQuery {
  id: string;
  granularity?: string;
  label?: string;
  rawDataEnabled: boolean;
  name?: string;
  aggregation: AggregatesType;
}

export type OnQueryChange = (
  patch: Partial<TimeSeriesQuery>,
  shouldRunQuery?: boolean,
  withTimeout?: boolean,
) => void;

export type OnFieldChange = (
  key: keyof TimeSeriesQuery,
  shouldRunQuery?: boolean,
  withTimeout?: boolean,
) => (event: ChangeEvent<HTMLInputElement>) => void;

export type QueryOptions = DataQueryRequest<TimeSeriesQuery>;

export const defaultQueryOptions: Partial<TimeSeriesQuery> = {
  id: '',
  granularity: '2s',
  rawDataEnabled: false,
  label: '',
  name: '',
  aggregation: AggregatesType.AVERAGE
};

export type Tuple<T> = [T, T];

export enum HttpMethod {
  POST = 'POST',
  GET = 'GET',
}

export type EditorProps = QueryEditorProps<
  DataSource,
  TimeSeriesQuery,
  MyDataSourceOptions
>;

// proxy request options
export type DataQueryRequestItem = {
  start?: string | number;
  end?: string | number;
  limit?: number;
  id: string;
};

export type ProxyRequestDataOptions = {
  aggregates?: [AggregatesType];
  granularity?: string;
  ignoreUnknownIds?: boolean;
  items: DataQueryRequestItem[];
  limit?: number;
  start?: string | number;
  end?: string | number;
};

export const defaultProxyRequestDataOptions = {
  ignoreUnknownIds: false,
};

export type ProxyRequestOptions = {
  data?: ProxyRequestDataOptions;
  endpoint?: string;
  method: HttpMethod;
}

// proxy response
export interface ProxyResponseDataPointItem {
  [AggregatesType.AVERAGE]?: number;
  [AggregatesType.MAX]?: number;
  [AggregatesType.MIN]?: number;
  [AggregatesType.SUM]?: number;
  [AggregatesType.COUNT]?: number;
  [AggregatesType.INTERPOLATION]?: number;
  value?: number;
  timestamp?: number;
}

export interface ProxyResponseItem {
  id: string;
  name?: string;
}

export interface ProxyResponseDataItem extends ProxyResponseItem {
  datapoints: ProxyResponseDataPointItem[];
}

export interface ProxyResponseData {
  items: ProxyResponseDataItem[];
  id?: string;
}

export interface ProxyResponse {
  status: number,
  data: ProxyResponseData;
}

// time series data source types
export interface DataSourceRequestOptions extends ProxyRequestOptions {
  target: TimeSeriesQuery;
}

export type DataSourceItem = {
  data: ProxyResponseData;
  target: TimeSeriesQuery;
};

export type QueryProxyType = (options: ProxyRequestOptions) => Promise<ProxyResponse>;
export type GetSingleTimeseriesType = (id: string) => Promise<SelectableValue | null>;

export interface QueryRequestError {
  refId: string;
  requestId: string;
  error: string;
}

export type DropdownOptions = Promise<Array<SelectableValue<string>>>;

export type Range = {
  start: number;
  end: number;
  precomputed?: boolean;
};
