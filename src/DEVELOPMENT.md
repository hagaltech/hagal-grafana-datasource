# Hagal API Data Source Development
To start development install dependencies

   ```bash
   yarn install
   ```

### Docker
The easiest way to work on this plugin is to run it using Docker.

Spin up a Grafana instance and run the plugin inside it

   ```bash
   yarn run server
   ```
or, for debugging and development, run the plugin in development mode in parallel with a Grafana instance

   ```bash
   yarn run server:watch
   ```

### Local Development Setup
Another way to work on this datasource is to create a symbolic link in data/plugins that points to plugin directory.
```
ln -s /path/to/your/plugin /path/to/grafana/data/plugins/your-plugin
```

Then, for debugging build plugin in development mode run it in watch mode

   ```bash
   yarn run dev
   ```

or build plugin in production mode

   ```bash
   yarn run build
   ```


### Tests
Run the tests (using Jest)

   ```bash
   yarn run test
   ```
