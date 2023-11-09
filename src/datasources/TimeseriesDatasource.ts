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
import {getRange, isGranularityGreaterOrEqual1h, splitRange} from '../utils';
import {handleError} from '../appEventHandler';

export function getDataQueryRequestItem(props: {
  target: TimeSeriesQuery,
  timeFrame: [number, number],
  precomputed?: boolean
}): DataSourceRequestOptions {
  const {target, timeFrame, precomputed} = props;
  const { granularity, id, rawDataEnabled, aggregation } = target;
  const [start, end] = timeFrame;

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

    endpoint = precomputed ? '/datapoints/precomputed-aggregates' : '/datapoints/aggregate';
  }

  return {
    data: defaults(dataWithoutDefaults, defaultProxyRequestDataOptions),
    endpoint,
    target: target,
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

    const itemsForProxyPromises: DataSourceRequestOptions[] = options.targets
      .filter(option => !!option.id)
      .flatMap(target => {
        const { rawDataEnabled, granularity } = target;

        if (!rawDataEnabled && isGranularityGreaterOrEqual1h(granularity)) {
          return splitRange([start, end]).map(range => getDataQueryRequestItem({
            target,
            timeFrame: [range.start, range.end],
            precomputed: range.precomputed || false
          }));
        }

        // When rawDataEnabled or granularity is less than 1h, just use the single time frame
        return [getDataQueryRequestItem({
          target,
          timeFrame: [start, end],
        })];
      });

    let data: DataSourceItem[] = await Promise.all(
      itemsForProxyPromises.map(async ({target, endpoint, method, data}) => {
        let response;

        try {
          response = await this.queryProxy({
            endpoint,
            method,
            data
          });

          return {target, data: response.data};
        } catch (err) {
          handleError(err, target.refId, options.requestId);

          return {
            target, data: {
              items: [
                {
                  id: target.id,
                  datapoints: []
                }
              ]
            }
          };
        }

      })
    );

    // Consolidate data items by 'refId' after splitting the range
    data = Object.values(data.reduce((acc: { [key: string]: DataSourceItem }, current: DataSourceItem) => {
      const currentId = current.target.refId;
      const currentDatapoints = current.data.items[0].datapoints;

      if (acc[currentId]) {
        // Concatenate the datapoints if the item already exists in the accumulator
        acc[currentId].data.items[0].datapoints = [
          ...acc[currentId].data.items[0].datapoints,
          ...currentDatapoints,
        ];
      } else {
        // Otherwise, add the new item to the accumulator
        acc[currentId] = current;
      }

      return acc;
    }, {}));

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
