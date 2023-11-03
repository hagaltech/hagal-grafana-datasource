import defaults from 'lodash/defaults';
import {
  DataQueryRequest,
  DataQueryResponse,
  MutableDataFrame,
  FieldType
} from '@grafana/data';
import {
  ProxyRequestDataOptions,
  DataSourceItem,
  defaultProxyRequestDataOptions,
  HttpMethod,
  QueryOptions,
  TimeSeriesQuery,
  DataSourceRequestOptions,
  QueryProxyType
} from '../types';
import {getRange} from '../utils';
import {handleError} from '../appEventHandler';

export function getDataQueryRequestItem(props: {
  target: TimeSeriesQuery,
  timeFrame: [number, number]
}): DataSourceRequestOptions {
  const { granularity, id, rawDataEnabled, aggregation } = props.target;
  const [start, end] = props.timeFrame;

  let dataWithoutDefaults: ProxyRequestDataOptions;
  let endpoint;

  if(rawDataEnabled) {
    dataWithoutDefaults = {
      items: [{
        id,
        start,
        end,
        limit: 0,
      }]
    };

    endpoint = '/datapoints/list';
  } else {
    dataWithoutDefaults = {
      items: [
        {
          id
        }
      ],
      start,
      end,
      aggregates: [aggregation],
      granularity,
      limit: 3000
    };

    endpoint = '/datapoints/aggregate';
  }

  return {
    data: defaults(dataWithoutDefaults, defaultProxyRequestDataOptions),
    endpoint,
    target: props.target,
    method: HttpMethod.POST
  };
}

export class TimeseriesDatasource {
  private queryProxy: QueryProxyType;
  constructor(props: {
    queryProxy: QueryProxyType;
  }) {
    this.queryProxy = props.queryProxy;
  }

  async getCurrentLabel({ target, data }: DataSourceItem): Promise<string> {
    const label = target.label;
    if (label) {
      return label;
    }

    const currentItem = data.items[0];
    return target.name || currentItem?.id || target.id;
  };

  async convertToDataFrame(props: {
    queries: DataSourceItem[]
  }):  Promise<MutableDataFrame[]> {
    const {queries} = props;

    return await Promise.all(queries.map(async query => {
      const {target, data} = query;
      const {rawDataEnabled, refId, aggregation} = target;

      const currentItemLabel = await this.getCurrentLabel({target, data});
      const frame = new MutableDataFrame({
        refId: refId,
        fields: [
          {name: 'target', type: FieldType.string},
          {name: 'timestamp', type: FieldType.time},
          {name: currentItemLabel, type: FieldType.number}
        ],
      });

      const currentItem = data.items[0];

      if(currentItem) {
        const currentItemId = currentItem.id;

        currentItem.datapoints.forEach(datapoint => {
          frame.add({
            target: currentItemId,
            timestamp: datapoint.timestamp,
            [currentItemLabel]: !rawDataEnabled ? datapoint[aggregation] : datapoint.value
          });
        });
      }

      return frame;
    }));
  }

  async fetchTimeseries(
    options: QueryOptions
  ): Promise<any> {
    const [start, end] = getRange(options.range);

    const itemsForProxyPromises = options.targets.filter(option => !!option.id).map((target) => {
      return getDataQueryRequestItem({
        target,
        timeFrame: [start, end],
      });
    });

    const data = await Promise.all(
      itemsForProxyPromises.map(async ({ target, endpoint, method, data }) => {
        let response;

        try {
          response = await this.queryProxy({
            endpoint,
            method,
            data
          });
        } catch (err) {
          handleError(err, target.refId, options.requestId);
        }

        return { target, data: response ? response.data : null };
      })
    );

    const filteredData = data
      .filter(item => item.data && 'items' in item.data) as DataSourceItem[];

    return await this.convertToDataFrame({
      queries: filteredData,
    });
  }

  async query(options: DataQueryRequest<TimeSeriesQuery>): Promise<DataQueryResponse> {
    const timeseriesResults = await this.fetchTimeseries(options);

    return {
      data: timeseriesResults,
    };
  }
}
