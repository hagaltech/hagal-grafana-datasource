import {of, throwError} from 'rxjs';
import {DataSourceInstanceSettings} from '@grafana/data';
import _ from 'lodash';

import {DataSource, PROXY_PATH} from './datasource';
import {DataSourceConnectionOptions, ProxyRequestDataOptions} from './types';

import timeseriesFilterData from 'mock/timeseriesFilterData.json';

type MockData = {
  [key: string]: any;
};
type ErrorObject = {
  status?: number;
  data?: {
    error: {
      code: number;
      message: string;
    };
  };
};
type mockErrorFunctionType = ((data: ProxyRequestDataOptions) => ErrorObject) | undefined;

export function getItemsResponseObject(items: MockData) {
  return {
    data: {
      items,
    },
    status: 200
  };
}

export function getTimeseriesResponse(data: ProxyRequestDataOptions, dpNumber = 5) {
  const {aggregates, items} = data;
  const aggregate = aggregates ? aggregates[0] : 'value';

  const datapoints = new Array(dpNumber).fill(null).map((_, i) => ({
    timestamp: i * 600000 + 1549336675000,
    [aggregate]: i,
  }));

  return _.map(items, ({ id }) => ({
    id,
    datapoints,
  }));
}

const instanceSettings: DataSourceInstanceSettings<DataSourceConnectionOptions> = {
  id: 1,
  type: 'hagal-api-datasource',
  name: 'Hagal API Data',
  access: 'direct'
} as DataSourceInstanceSettings<DataSourceConnectionOptions>;

export const getMockedDataSource = () => new DataSource(instanceSettings);

const mockData: MockData = {
  [`/${PROXY_PATH}/timeseries/filter`]: () => timeseriesFilterData,
  [`/${PROXY_PATH}/datapoints/aggregate`]: getTimeseriesResponse,
  [`/${PROXY_PATH}/datapoints/list`]: getTimeseriesResponse,
};

export function getMockedFetch(mockErrorFunction?: mockErrorFunctionType) {
  return ({ url, data }: { url: string, data: ProxyRequestDataOptions }) => {
    if (mockErrorFunction) {
      const error = mockErrorFunction(data);
      if (error) {
        return throwError(() => error);
      }
    }

    if (mockData[url]) {
      return of(getItemsResponseObject(mockData[url](data)));
    }

    return of(getItemsResponseObject([]));
  };
}
