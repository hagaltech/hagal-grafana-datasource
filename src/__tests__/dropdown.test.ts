import {getMockedDataSource, getMockedFetch} from 'testUtils';
import {SelectableValue} from '@grafana/data';

const mockedFetch = jest.fn(getMockedFetch());
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: jest.fn(() => ({
    fetch: mockedFetch
  }))
}));

type Mock = jest.Mock;

const ds = getMockedDataSource();

describe('Timeseries Dropdown Options', () => {
  describe('Given a request for timeseries options', () => {
    let result: Array<SelectableValue<string>>;

    beforeAll(async () => {
      result = await ds.getOptionsForDropdown('');
    });

    it('should generate the correct request', () => {
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect((mockedFetch as Mock).mock.calls[0][0]).toMatchSnapshot();
    });

    it('should return all timeseries', () => {
      expect(result).toMatchSnapshot();
    });
  })

  describe('Given a search string for timeseries options', () => {
    let result: Array<SelectableValue<string>>;

    beforeAll(async () => {
      result = await ds.getOptionsForDropdown('SOC');
    });

    it('should generate the correct request', () => {
      expect(mockedFetch).toHaveBeenCalledTimes(1);
      expect((mockedFetch as Mock).mock.calls[0][0]).toMatchSnapshot();
    });

    it('should return timeseries with SOC in their id or label', () => {
      expect(result).toMatchSnapshot();
    });
  })
})
