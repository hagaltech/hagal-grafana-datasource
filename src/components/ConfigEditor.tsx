import React, {ChangeEvent} from 'react';
import {InlineField, Input, SecretInput} from '@grafana/ui';
import {DataSourcePluginOptionsEditorProps} from '@grafana/data';
import defaults from 'lodash/defaults';

import {defaultMyDataSourceOptions, MyDataSourceOptions, MySecureDataSourceOptions} from '../types';

type ConfigEditorProps = DataSourcePluginOptionsEditorProps<
  MyDataSourceOptions,
  MySecureDataSourceOptions
>;

export function ConfigEditor(props: ConfigEditorProps) {
  const {onOptionsChange, options} = props;

  const {jsonData: jsonDataWithoutDefaults, secureJsonFields} = options;
  const jsonData = defaults(jsonDataWithoutDefaults, defaultMyDataSourceOptions);
  const secureJsonData = (options.secureJsonData || {}) as MySecureDataSourceOptions;

  const {apiURL, authDomain} = jsonData;

  const {clientId = '', clientSecret = ''} = secureJsonData;

  const onJsonDataChange = (patch: Partial<ConfigEditorProps['options']['jsonData']>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        ...patch,
      },
    });
  };

  const onJsonStringValueChange =
    (key: keyof MyDataSourceOptions) => (event: ChangeEvent<HTMLInputElement>) =>
      onJsonDataChange({[key]: event.target.value});

  const onChangeSecretValue =
    (secretKey: keyof MySecureDataSourceOptions) => (event: ChangeEvent<HTMLInputElement>) =>
      onOptionsChange({
        ...options,
        secureJsonData: {
          ...options.secureJsonData,
          [secretKey]: event.target.value,
        },
      });

  const onResetSecretValue = (secretKey: keyof MySecureDataSourceOptions) => () =>
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        [secretKey]: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        [secretKey]: '',
      },
    });

  return (
    <>
      <div className="gf-form-group">
        <h3 className="page-heading">HTTP</h3>

        <InlineField label="URL" labelWidth={12}>
          <Input
            onChange={onJsonStringValueChange('apiURL')}
            value={apiURL}
            placeholder="https://your-api-url"
            width={40}
          />
        </InlineField>

      </div>

      <div className="gf-form-group">
        <h3 className="page-heading">Auth0</h3>

        <InlineField label="Domain" labelWidth={12}>
          <Input
            onChange={onJsonStringValueChange('authDomain')}
            value={authDomain}
            placeholder="Your Auth0 domain"
            width={40}
          />
        </InlineField>

        <InlineField label="Client Id" labelWidth={12}>
          <SecretInput
            isConfigured={(secureJsonFields && secureJsonFields.clientId) as boolean}
            value={clientId}
            placeholder="******"
            width={40}
            onReset={onResetSecretValue('clientId')}
            onChange={onChangeSecretValue('clientId')}
          />
        </InlineField>

        <InlineField label="Client Secret" labelWidth={12}>
          <SecretInput
            isConfigured={(secureJsonFields && secureJsonFields.clientSecret) as boolean}
            value={clientSecret}
            placeholder="******"
            width={40}
            onReset={onResetSecretValue('clientSecret')}
            onChange={onChangeSecretValue('clientSecret')}
          />
        </InlineField>
      </div>
    </>
  );
}
