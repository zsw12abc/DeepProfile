# Observability

This document summarizes built-in monitoring and analytics hooks.

## Features

- Error monitoring: captures runtime errors and background failures.
- Behavior analytics: tracks key feature interactions (analysis buttons, comment analysis).
- Performance monitoring: records analysis duration and item counts.
- Compliance monitoring: records redaction mode signals during analysis.

## Configuration

Observability controls live under the Debug settings page:

- Error monitoring
- Behavior analytics
- Performance monitoring
- Compliance monitoring
- Telemetry endpoint (optional)
- Sample rate

In production builds, telemetry is disabled by default. It will only run when
both "Allow in production" and "Confirm production consent" are enabled. The
observability settings UI is only visible in `npm run dev`.

If a telemetry endpoint is provided, records are batched and sent via POST:

```
POST /your-endpoint
{
  "records": [
    {
      "id": "...",
      "category": "error|event|performance|compliance",
      "name": "...",
      "timestamp": 1710000000000,
      "data": { "platform": "zhihu" }
    }
  ]
}
```

When no endpoint is configured, records are stored locally in extension storage.
