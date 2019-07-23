# Common JS utils

## Migration guide
### 4.4.2

Prometheus middleware `getHttpRequestMetricsMiddleware` is now deprecated, you should remove it, same metrics can be aggregated from `getRequestDurationMetricsMiddleware` alone 

### 5.2.0

Added loggly adapter. To use loggly you have to set `silent:false` and loggly token via `LOGGLY_TOKEN` env or directly in the config.

### 7.1.0

- Added default timeouts for getMongoCachedJSONFetcher (2000ms for fetch execution, 20000ms for background request)
- parallel call of the fetcher will not cause parallel requests to database nor the URL 
