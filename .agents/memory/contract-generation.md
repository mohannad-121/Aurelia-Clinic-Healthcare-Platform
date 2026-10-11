---
name: Contract generation
description: Non-obvious Orval generator pitfalls encountered in this workspace
---

When an operation combines enum path parameters and query parameters, inspect generated Zod/type exports for naming collisions. Resolve collisions by restructuring or renaming the source contract definitions; do not patch generated code.

**Why:** Orval generated duplicate operation `Params` exports when management resource path enums and a search query were combined. Generation succeeded but TypeScript compilation then failed, and rerunning the generator reproduced the failure.

**How to apply:** Any new management query parameters need a generation-plus-library-typecheck pass. If collisions recur, fix source names/shapes or the generator configuration and regenerate.
