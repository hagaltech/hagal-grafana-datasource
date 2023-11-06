import {DataQueryResponse, DataQueryResponseData} from '@grafana/data';

import {getMockedDataSource, getMockedFetch} from 'testUtils';
import {AggregatesType, TimeSeriesQuery} from '../types';
import {eventBusService, FAILED_ERROR_TYPE} from '../appEventHandler';

const mockedFetch = jest.fn(getMockedFetch());

// Spying on 'publish' method to track handleError calls from the appEventHandler.ts
const mockedErrorEventHandler = jest.spyOn(eventBusService, 'publish');
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({
    fetch: mockedFetch
  }))
}));

const ds = getMockedDataSource();

const options: any = {
  targets: [],
  range: {
    from: 1549336675000,
    to: 1549338475000,
  },
  interval: '30s',
  intervalMs: 30000,
  maxDataPoints: 491,
  format: 'json',
  panelId: 1,
  dashboardId: 1,
};

const granularityError = {
  status: 400,
  data: {
    error: {
      code: 400,
      message: 'Unrecognized granularity',
    },
  },
};

type Mock = jest.Mock;
type TimeSeriesQueryLike = Partial<TimeSeriesQuery>;
function getFieldByName(data: DataQueryResponseData, name: string) {
  return data.fields.find((field: { name: string }) => field.name === name);
}
describe('Datasource Query', () => {
  describe('Given "Search Timeseries" queries', () => {
    let result: DataQueryResponse;
    const label = 'test-label';
    const id1 = 'test1';
    const id4 = 'test4';

    const tsTargetA: TimeSeriesQueryLike = {
      aggregation: AggregatesType.AVERAGE,
      refId: 'A',
      id: id1,
      granularity: '1h'
    };
    const tsTargetB: TimeSeriesQueryLike = {
      aggregation: AggregatesType.MIN,
      refId: 'B',
      id: 'test2',
      granularity: '1h',
    };
    const tsTargetC: TimeSeriesQueryLike = {
      aggregation: AggregatesType.MAX,
      refId: 'C',
      id: 'test3',
      granularity: '1h',
      label
    };
    const tsTargetD: TimeSeriesQueryLike = {
      refId: 'C',
      id: id4,
      granularity: '1h',
      rawDataEnabled: true
    };

    beforeAll(async () => {
      options.intervalMs = 1;
      options.targets = [tsTargetA, tsTargetB, tsTargetC, tsTargetD];

      result = await ds.query(options);
    });

    it('should generate the correct queries', async () => {
      // the first is for setOptionsForDropdown
      expect(mockedFetch).toBeCalledTimes(5);
      expect((mockedFetch as Mock).mock.calls[1][0]).toMatchSnapshot();
      expect((mockedFetch as Mock).mock.calls[2][0]).toMatchSnapshot();
      expect((mockedFetch as Mock).mock.calls[3][0]).toMatchSnapshot();
      expect((mockedFetch as Mock).mock.calls[4][0]).toMatchSnapshot();
    });

    it('should return the correct datapoints', () => {
      const { id: idA } = tsTargetA;
      const { id: idB } = tsTargetB;
      const { id: idC } = tsTargetC;
      const { id: idD } = tsTargetD;

      const targetFieldA = getFieldByName(result.data[0], 'target');
      const targetFieldB = getFieldByName(result.data[1], 'target');
      const targetFieldC = getFieldByName(result.data[2], 'target');
      const targetFieldD = getFieldByName(result.data[3], 'target');

      expect(targetFieldA).toBeDefined();
      targetFieldA && expect(targetFieldA.values.get(0)).toEqual(idA);

      expect(targetFieldB).toBeDefined();
      targetFieldB && expect(targetFieldB.values.get(0)).toEqual(idB);

      expect(targetFieldC).toBeDefined();
      targetFieldC && expect(targetFieldC.values.get(0)).toEqual(idC);

      expect(targetFieldD).toBeDefined();
      targetFieldD && expect(targetFieldD.values.get(0)).toEqual(idD);
    });

    it('should return correct labels', () => {
      const labelFieldC = getFieldByName(result.data[2], label);

      expect(labelFieldC).toBeDefined();
      expect(labelFieldC.values.length).toBeGreaterThan(1);
      expect(labelFieldC.values.every((value: number) => value !== undefined)).toBeTruthy();
    });

    it('should return correct datapoints with rawDataEnabled', () => {
      const labelFieldA = getFieldByName(result.data[0], id1);
      expect(labelFieldA).toBeDefined();
      expect(labelFieldA.values.length).toBeGreaterThan(1);
      expect(labelFieldA.values.every((value: number) => value !== undefined)).toBeTruthy();

      const labelFieldD = getFieldByName(result.data[3], id4);
      expect(labelFieldD).toBeDefined();
      expect(labelFieldD.values.length).toBeGreaterThan(1);
      expect(labelFieldD.values.every((value: number) => value !== undefined)).toBeTruthy();
    });
  });

  describe('Given "Search Timeseries" queries with errors', () => {
    let result: DataQueryResponse;
    const id = 'test1';
    const tsTargetA: TimeSeriesQueryLike = {
      aggregation: AggregatesType.AVERAGE,
      refId: 'A',
      id,
    };
    const tsTargetB: TimeSeriesQueryLike = {
      aggregation: AggregatesType.AVERAGE,
      refId: 'B',
      id: 'test2',
    };

    beforeAll(async () => {
      mockedFetch.mockImplementation(getMockedFetch(data => data.items[0].id === id ? granularityError : {}));

      options.intervalMs = 60000; // 1m
      options.targets = [tsTargetA, tsTargetB];

      result = await ds.query(options);
    });

    it('should return an empty array', () => {
      expect(result).toEqual({ data: [] });
    });

    it('should display errors for invalid queries', () => {
      expect(mockedErrorEventHandler as Mock).toBeCalledTimes(2);

      expect((mockedErrorEventHandler as Mock).mock.calls[0][0]).toEqual({
        type: FAILED_ERROR_TYPE,
        payload: {
          refId: 'A',
          error: '[400 ERROR] Unrecognized granularity',
        }
      });

      expect((mockedErrorEventHandler as Mock).mock.calls[1][0]).toEqual({
        type: FAILED_ERROR_TYPE,
        payload: {
          refId: 'B',
          error: 'Unknown error',
        }
      });
    });
  });
});
