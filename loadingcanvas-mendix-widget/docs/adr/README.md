# Architecture Decision Records

ADR format (min 5 lines):

```
# NNNN — <Title>

## Context
<problem, constraints, why this decision is needed>

## Options
<2+ viable options considered>

## Decision
<what was chosen>

## Consequences
<positive + negative trade-offs>

## Debt created
<#id in DEBT.md, or "none">
```

Current ADRs:

- `0001-offline-capable.md` — manifest `offlineCapable="false"` because plan/cargo loads use XPath.