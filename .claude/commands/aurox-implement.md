# /aurox-implement

Implement the requested Aurox feature as a safe vertical slice.

## Required Behavior

Before editing:

1. Identify affected packages.
2. Inspect existing files.
3. State the intended slice.
4. Preserve architecture.

During implementation:

- contracts first
- DB/repository second
- package/domain logic third
- web query/mapper/service fourth
- route/UI last
- tests/docs where relevant

After implementation:

Report:

```text
Files changed:
- ...

Behavior added:
- ...

Architecture boundaries:
- ...

Verification:
- ...

Known limitations:
- ...

Next step:
- ...
```
