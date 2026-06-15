# Performance Test Instructions — ProcessCanvas

## Targets (from NFRs)
- **Concurrent users**: ~100
- **Scoring round-trip**: < 2s under normal load
- **UI feedback**: sub-second client interactions
- **Error rate**: < 1% under target load

## Setup
- Deploy a dev stack (`cdk deploy`) or run the API locally.
- Use a load tool (k6 or JMeter).

## Load test (k6 example)
```bash
k6 run --vus 100 --duration 2m load/submit-scoring.js
```
- Script should: authenticate, GET exercise, PUT placements, POST submit; assert p95 latency < 2s.

## Scenarios
1. **Submit/scoring under load**: 100 virtual users submitting concurrently.
2. **Authoring read load**: instructors listing templates/configurations.
3. **Live session burst**: many students joining + submitting within a short window.

## Analyze
- Capture p50/p95/p99 latency, throughput, error rate.
- If p95 scoring > 2s: check Lambda cold starts (provisioned concurrency), DynamoDB throttling (on-demand should absorb), payload sizes.

> Note: scoring is pure/in-memory, so latency is dominated by Lambda + DynamoDB I/O, not computation.
