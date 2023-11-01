import React, { useState, useEffect, useCallback } from 'react';
import { SelectableValue } from '@grafana/data';
import {AsyncSelect, InlineField, InlineLabel, Input} from '@grafana/ui';
import {DropdownOptions, GetSingleTimeseriesType, OnFieldChange, OnQueryChange, TimeSeriesQuery} from '../types';

export function ResourceSelect(props: {
  query: TimeSeriesQuery;
  onQueryChange: OnQueryChange;
  onFieldChange: OnFieldChange;
  getSingleTimeseries: GetSingleTimeseriesType;
  searchResource: (query: string) => DropdownOptions;
  onBlur: () => void;
}) {
  const { searchResource, getSingleTimeseries, onBlur, query, onFieldChange, onQueryChange } = props;
  const { id } = query;

  const [current, setCurrent] = useState<SelectableValue<string> | null>(null);

  const onDropdown = (option: SelectableValue<string>) => {
    onQueryChange({id: option.id});
  };

  const setDropdownResource = useCallback(async () => {
    try {
      const resource = await getSingleTimeseries(id);

      setCurrent(resource ? resource : {});
      onQueryChange({name: resource ? resource.label : ''}, false);
    } catch (error) {
      console.error(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, getSingleTimeseries]);

  useEffect(() => {
    (async () => {
      await setDropdownResource();
    })();
  }, [setDropdownResource]);

  return (
    <>
      <InlineLabel
        tooltip={'Time series name'}
        width={10}
        className="dropdown-label"
      >
        {current?.value ? 'Name' : 'Search'}
      </InlineLabel>

      <AsyncSelect
        loadOptions={(query) => searchResource(query)}
        defaultOptions
        value={current?.value ? current : null}
        placeholder="Search time series by name/description"
        className="dropdown dropdown--timeseries"
        onChange={onDropdown}
      />

      <InlineField label="Id">
        <Input
          value={id || ''}
          width={40}
          onChange={onFieldChange('id', true, true)}
          onBlur={() => onBlur()}
          type="string"
          placeholder="Insert Id"
        />
      </InlineField>
    </>
  );
}
