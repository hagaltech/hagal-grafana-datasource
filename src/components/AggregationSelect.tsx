import React, { useState, useEffect } from 'react';
import { SelectableValue } from '@grafana/data';
import {Select, InlineLabel} from '@grafana/ui';
import {AggregatesType, OnQueryChange, TimeSeriesQuery} from '../types';

const options: Array<SelectableValue<AggregatesType>> = Object.values(AggregatesType).map(value => ({
  label: value,
  value
}));

const getSingleOption = (value: AggregatesType): SelectableValue<AggregatesType> | null => {
  return options.find(option => option.value === value) || null;
}
export function AggregationSelect(props: {
  query: TimeSeriesQuery;
  onQueryChange: OnQueryChange;
}) {
  const { query, onQueryChange } = props;
  const { aggregation, rawDataEnabled } = query;

  const [current, setCurrent] = useState<SelectableValue<AggregatesType> | null>(null);

  const onDropdown = (option: SelectableValue<AggregatesType>) => {
    onQueryChange({aggregation: option.value});
  };

  useEffect(() => {
    setCurrent(getSingleOption(aggregation));
  }, [aggregation]);

  return (
    <>
      <InlineLabel width={11} className="dropdown-label">
        Aggregation
      </InlineLabel>

      <Select
        options={options}
        value={current?.value ? current : null}
        onChange={onDropdown}
        className="dropdown dropdown--aggregation"
        disabled={rawDataEnabled}
      />
    </>
  );
}
