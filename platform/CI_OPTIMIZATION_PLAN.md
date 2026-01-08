# CI Optimization Plan

**Goal:** Reduce PR CI time to ~5 minutes or less

## Current State

PR workflow runs these jobs in parallel:
- `platform-linting-and-tests` (~3-5 min) - **bottleneck**
- `platform-docker-image-scanning` (~5-10 min) - **bottleneck**
- `helm-chart-linting-and-tests` (~2-3 min)
- `platform-e2e-tests` - **already skipped on PRs**

## Recommended Optimizations

### 1. Skip Docker Scanning on PRs (High Impact)

**Current:** Docker image build + Scout scanning runs on every PR (~5-10 min)
**Proposed:** Only run on merge queue (like e2e tests)

```yaml
# In platform-linting-and-tests.yml, platform-docker-image-scanning job
- name: Build Docker image
  if: ${{ github.event_name == 'merge_group' && inputs.should-skip-running-and-always-succeed != true }}
```

**Savings:** ~5-10 minutes on PRs

### 2. Parallelize check:ci Tasks (Medium Impact)

**Current:** Each package runs sequentially:
```bash
pnpm type-check && pnpm test && pnpm knip && biome ci
```

**Option A - Use Turbo task parallelization:**
```json
// turbo.json - Split check:ci into parallel tasks
{
  "tasks": {
    "check:ci": {
      "dependsOn": ["type-check", "test:unit", "knip", "lint:biome"]
    },
    "type-check": { "cache": true },
    "test:unit": { "cache": false },
    "knip": { "cache": true },
    "lint:biome": { "cache": true }
  }
}
```

**Option B - Run commands in parallel with concurrently:**
```json
// package.json
"check:ci": "concurrently -g 'pnpm type-check' 'pnpm test' 'pnpm knip' 'biome ci'"
```

**Savings:** ~1-2 minutes (tasks run in ~max(all) instead of sum(all))

### 3. Enable Turbo Caching for Lint Tasks (Low-Medium Impact)

**Current:** `check:ci` caches based on inputs but tasks within don't cache individually
**Proposed:** Already configured, just ensure cache hits work

Check cache hit rate:
```bash
TURBO_LOG_VERBOSITY=1 turbo check:ci
```

### 4. Conditional Helm Linting (Low Impact)

Only run when helm files change:

```yaml
paths-filter:
  outputs:
    helm-chart: ${{ steps.filter.outputs.helm-chart }}
  # Add filter:
  helm-chart:
    - 'platform/helm/**'

helm-chart-linting-and-tests:
  if: ${{ needs.paths-filter.outputs.helm-chart == 'true' }}
```

**Savings:** ~2-3 minutes when helm unchanged

### 5. Skip knip on PRs (Optional, Low Impact)

Knip (dead code detection) is slow and could run only on merge queue:

```json
// package.json
"check:ci": "pnpm type-check && pnpm test && biome ci",
"check:ci:full": "pnpm type-check && pnpm test && pnpm knip && biome ci"
```

## Implementation Priority

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Skip Docker scanning on PRs | -5-10 min | Low |
| 2 | Conditional Helm linting | -2-3 min | Low |
| 3 | Parallelize check:ci | -1-2 min | Medium |
| 4 | Skip knip on PRs | -30s-1min | Low |

## Expected Results

**Before:** ~8-15 min (parallel jobs, slowest wins)
**After:** ~3-5 min (linting only)

## Quick Win Implementation

To immediately get to ~5 min, just skip Docker scanning on PRs:

```yaml
# platform-docker-image-scanning job
- name: Build Docker image
  if: ${{ github.event_name == 'merge_group' }}
```

This alone should bring PR CI to ~3-5 minutes.
