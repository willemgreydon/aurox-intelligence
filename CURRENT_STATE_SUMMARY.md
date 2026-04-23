# Current State Summary

This consolidated repository was assembled from three ZIP snapshots:
- the web application
- the worker application
- the monorepo scaffold and architecture docs

Key readiness improvements applied in this bundle:
- restored monorepo root structure under `apps/*` and `packages/*`
- added missing root `tsconfig.base.json`
- added `turbo.json`
- added `pnpm-workspace.yaml`
- copied full source workspaces from `@repo/*` package snapshots
- removed the missing `@repo/ingestion` dependency from the worker package
- added missing `@types/node` development dependency to web and worker packages
- added a concrete simulation smoke-test plan

Primary simulation path available now:
- session creation via broker-mode launchpad
- simulation workstation read model
- simulation order execution via `@repo/agents` simulation adapter
- portfolio, order, transaction, snapshot, and lane readouts in the invest surfaces
