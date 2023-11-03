import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  SelectableValue,
} from '@grafana/data';
import {BackendSrv, getBackendSrv} from '@grafana/runtime';
import {firstValueFrom} from 'rxjs';

import {
  ProxyResponseItem,
  DataSourceConnectionOptions,
  HttpMethod,
  MyDataSourceOptions,
  QueryProxyType,
  TimeSeriesQuery,
  GetSingleTimeseriesType,
  DropdownOptions,
} from './types';
import {TimeseriesDatasource} from './datasources';
import {stringifyDataError} from './utils';

export const PROXY_PATH = 'api';

export function resource2DropdownOption(resource: ProxyResponseItem): SelectableValue<string> {
  const { id, name } = resource;
  const value = id.toString();
  const label = name || value;

  return {
    label,
    value,
    id,
  };
}

export class DataSource extends DataSourceApi<TimeSeriesQuery, MyDataSourceOptions> {
  url: string;
  backendSrv: BackendSrv;
  options: DropdownOptions;
  timeseriesDatasource: TimeseriesDatasource;

  constructor(instanceSettings: DataSourceInstanceSettings<DataSourceConnectionOptions>) {
    super(instanceSettings);

    this.url = instanceSettings.url || '';

    this.backendSrv = getBackendSrv();

    this.options = this.setOptionsForDropdown();

    this.timeseriesDatasource = new TimeseriesDatasource({
      queryProxy: this.queryProxy,
    });
  }

  queryProxy: QueryProxyType = async (options) => {
    const {endpoint, method, data} = options;

    const url =  `${this.url}/${PROXY_PATH}${endpoint}`;

    const fetchOptions: any = {
      url,
      method,
    };

    if (method === HttpMethod.POST) {
      fetchOptions.data = data || {};
    }

    return await firstValueFrom(
      this.backendSrv.fetch(fetchOptions)
    );
  }

  async checkLoginStatusOAuth() {
    try {
      const response = await this.queryProxy({
        endpoint: '/token/inspect',
        method: HttpMethod.POST
      });

      return response?.status === 200;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

   getSingleTimeseries: GetSingleTimeseriesType = async (id: string): Promise<SelectableValue | null> => {
    const currentOption = (await this.options).find(option => id === option.id);

    return currentOption ?? null;
  };

  /**
   * used by query editor to search for timeseries
   */
  async setOptionsForDropdown(): DropdownOptions {
    const response = await this.queryProxy({
      endpoint: '/timeseries/filter',
      method: HttpMethod.POST
    });

    if(!response || !response.data || !response.data.items) {
      return [];
    }

    return response.data.items.map(resource2DropdownOption);
  }

  async getOptionsForDropdown(query: string): DropdownOptions {
    return (await this.options).filter(
      option => option.id.toLowerCase().includes(query.toLowerCase()) || (option.label && option.label.toLowerCase().includes(query.toLowerCase()))
    );
  }

  async query(options: DataQueryRequest<TimeSeriesQuery>): Promise<DataQueryResponse> {
    const queryTargets = options.targets.filter(target => target && !target.hide);

    try {
      return await this.timeseriesDatasource.query({
        ...options,
        targets: queryTargets
      });
    } catch (error: unknown) {
      console.error("An error occurred:", error);

      return {
        data: [],
        errors: [{
          message: stringifyDataError(error)
        }],
      };
    }
  }

  async testDatasource() {
    let isLoggedIn = await this.checkLoginStatusOAuth();

    return {
      status: isLoggedIn ? 'success' : 'error',
      message: isLoggedIn ? 'Success' : 'Your credentials are invalid',
      title: isLoggedIn ? 'Success' : 'Error',
    };
  }
}
