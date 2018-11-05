# Common JS utils

## Migration guide
### 4.4.2

Prometheus middleware `getHttpRequestMetricsMiddleware` is now deprecated, you should remove it, same metrics can be aggregated from `getRequestDurationMetricsMiddleware` alone 

### 5.2.0

Added loggly adapter. To use loggly you have to set `silent:false` and loggly token via `LOGGLY_TOKEN` env or directly in the config.