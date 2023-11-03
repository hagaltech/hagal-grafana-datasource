import defaults from 'lodash/defaults';
import React, {ChangeEvent, useState, useEffect, useCallback} from 'react';
import {
  InlineField,
  Input,
  InlineSwitch
} from '@grafana/ui';
import {SelectableValue} from '@grafana/data';
import {
  OnQueryChange,
  TimeSeriesQuery,
  defaultQueryOptions,
  EditorProps,
  OnFieldChange,
  DropdownOptions,
} from '../types';
import {AggregationSelect} from './AggregationSelect';
import {ResourceSelect} from './ResourceSelect';
import {eventBusService, FailedResponseEvent} from '../appEventHandler';

import '../css/queryEditor.css';

type CallbackReturnType = Array<SelectableValue<string>>;

type ErrorType = {
  [key: string]: string;
};
export function QueryEditor(props: EditorProps) {
  const {query: queryWithoutDefaults, onChange, onRunQuery, datasource, data} = props;
  const query = defaults(queryWithoutDefaults, defaultQueryOptions);

  const [error, setError] = useState<ErrorType>({});

  const [timer, setTimer] = useState<null | NodeJS.Timeout>(null);

  const onQueryChange: OnQueryChange = (patch, shouldRunQuery = true, withTimeout = false) => {
    onChange({...query, ...patch} as TimeSeriesQuery);

    if (shouldRunQuery) {
      setError({});

      if (withTimeout) {
        changeHandlerWithTimeout(onRunQuery);
      } else {
        onRunQuery();
      }
    }
  };

  // run change only on user stop typing
  const changeHandlerWithTimeout = (callback: Function): Promise<CallbackReturnType> => {
    return new Promise((resolve) => {
      if (timer) {
        clearTimeout(timer);
      }

      const newTimer = setTimeout(async () => {
        resolve(callback());
      }, 500);

      setTimer(newTimer);
    });
  };

  const blurHandlerWithTimeout = () => {
    setTimer(null);
    // clearTimeout(timer);
  }

  const onFieldChange: OnFieldChange = (key, shouldRunQuery = true, withTimeout = false) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

    onQueryChange({[key]: value}, shouldRunQuery, withTimeout);
  }

  const onSearchResourceChange = async (query: string): DropdownOptions => {
    return await datasource.getOptionsForDropdown(query);
  };

  const {granularity, label, rawDataEnabled, name, refId: thisRefId} = query;
  const thisRequestId = data?.request?.requestId;

  const handleError = useCallback((event: FailedResponseEvent) => {
    const { refId, requestId, error } = event.payload;

    if (thisRefId === refId) {
      setError((prev) => ({
        ...prev,
        [requestId]: error
      }));
    }
  }, [thisRefId]);

  useEffect(() => {
    const errorSubscription = eventBusService.subscribe(FailedResponseEvent, handleError);

    return () => {
      errorSubscription.unsubscribe();
    };
  }, [handleError]);

  return (
    <>
      <div className="gf-form-inline">
        <ResourceSelect
          {...{
            query,
            onQueryChange,
            onFieldChange,
            onBlur: blurHandlerWithTimeout,
            getSingleTimeseries: datasource.getSingleTimeseries,
            searchResource: onSearchResourceChange,
          }}
        />

        <InlineField label="Raw data">
          <InlineSwitch
            value={rawDataEnabled}
            onChange={onFieldChange('rawDataEnabled')}
          />
        </InlineField>
      </div>

      <div className="gf-form-inline">
        <InlineField
          label="Label"
          tooltip="Set the label for each time series."
        >
          <Input
            onChange={onFieldChange('label', true, true)}
            value={label}
            width={25}
            type="string"
            placeholder={name || 'default'}
          />
        </InlineField>

        {!rawDataEnabled && (
          <>
            <InlineField
              label="Granularity"
              disabled={rawDataEnabled}
              tooltip="The granularity of the aggregate values. Valid entries are: 'day' (or 'd'), 'hour' (or 'h'), 'minute' (or 'm'), 'second' (or 's'). Example: 12h."
            >
              <Input
                onChange={onFieldChange('granularity', true, true)}
                value={granularity}
                width={8}
                onBlur={blurHandlerWithTimeout}
                type="string"
                placeholder="2s"
              />
            </InlineField>

            <AggregationSelect
              {...{
                query,
                onQueryChange
              }}
            />
          </>
        )}
      </div>
      <div>
        {/* the error's request ID should match the query request ID */}
        {/* to ensure only relevant errors are displayed */}
        {thisRequestId && error?.[thisRequestId] && <pre className="gf-formatted-error">{error?.[thisRequestId]}</pre>}
      </div>
    </>
  );
}
