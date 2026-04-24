# Asset Taxonomy

This document defines canonical asset classification and metadata semantics.

## Canonical Asset Classes

- `stock`
- `etf`
- `crypto`
- `fx`
- `index`

Current simulation tradability focus is `stock`, `etf`, `crypto`.

## Metadata Dimensions

Each asset should maintain:
- `assetId`
- canonical symbol
- display symbol
- name
- category
- sector (when applicable)
- geography (when applicable)
- risk summary
- tradability flags
- provider symbol mapping
- broker identifier mapping
- search aliases
- metadata tags

## Tradability Flags

Two independent dimensions:
- simulation tradable
- planned live tradable

A symbol can be trackable but non-tradable.

## Symbol Mapping Model

Asset metadata should support:
- canonical symbol in product contracts
- provider-specific symbol keys
- broker-specific product identifiers

This avoids UI-level hardcoding and enables migration to live routes.

## Grouping Conventions

For workstation views, common groups are:
- by asset class
- by sector/category
- by liquidity/risk tag

## Search Conventions

Search should match:
- symbol
- name
- category
- sector
- aliases
- tags

## Taxonomy Governance

When adding symbols:
1. assign stable `assetId`
2. provide category/risk summary
3. set tradability flags explicitly
4. add provider/broker mappings where known
5. ensure aliases are useful for human search terms

## Future Work

- formal taxonomy versioning
- deprecation flow for renamed/delisted symbols
- mapping QA checks against provider catalogs
