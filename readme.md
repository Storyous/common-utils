# Common JS utils

## Migration guide
### 4.4.2

Prometheus middleware `getHttpRequestMetricsMiddleware` is now deprecated, you should remove it, same metrics can be aggregated from `getRequestDurationMetricsMiddleware` alone 
