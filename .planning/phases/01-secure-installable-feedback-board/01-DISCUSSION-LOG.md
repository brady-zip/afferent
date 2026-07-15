# Phase 1: Secure Installable Feedback Board - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 1-Secure Installable Feedback Board
**Areas discussed:** Internal scope primitive, Actor identity and privacy
**Peer consultation:** The live interactive Claude session was consulted through h5i radio. The user explicitly delegated all remaining questions to Claude after personally ratifying the first two scope choices.

---

## Internal Scope Primitive

### Schema scope

| Option | Description | Selected |
|--------|-------------|----------|
| Internal scope everywhere | Every row and relevant query/index path is scope-complete; normal installs use one fixed value. | ✓ |
| Keep the component unscoped | Preserve a conceptually pure single-product schema and invent a separate demo isolation strategy later. | |
| Defer to planning | Allow research/planning to decide after Phase 1 schema work begins. | |

**User's choice:** Internal scope everywhere.
**Notes:** The user ratified Claude's recommendation. The accepted cost is one internal field and leading index position in exchange for avoiding a later whole-schema isolation retrofit.

### Normal installation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic fixed scope | The normal client injects a library-owned constant; installers never configure or pass scope. | ✓ |
| Installer-configured constant | The host supplies one server-only value during wrapper construction. | |
| Required resolver | Every installation provides a trusted callback, even when it always returns one value. | |

**User's choice:** Automatic fixed scope.
**Notes:** This keeps the normal API honestly single-product and removes scope from consumer configuration.

### Sandbox resolver and enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Opt-in server-only resolver | The host client can accept a constrained `resolveScope(ctx)` callback invoked on every operation. | ✓ |
| Runtime/browser setting | The normal factory accepts scope configuration or browser-provided values. | |
| Divergent private demo backend | The repository demo implements isolation outside the package contract. | |

**User's choice:** Delegated to Claude; opt-in server-only resolver selected.
**Notes:** Missing scope fails before access, cross-scope IDs look not-found, no wildcard exists, and the showcase and sandbox remain separate static component instances. The resolver is an internal sandbox capability, not a multi-product feature.

---

## Actor Identity and Privacy

### Stable actor key

| Option | Description | Selected |
|--------|-------------|----------|
| Provider-namespaced immutable key | Host adapters derive a stable non-email, non-session key and the component treats it as opaque. | ✓ |
| Email identity | Use normalized email as the cross-provider ownership key. | |
| Raw provider record/ID | Persist provider-specific identity shapes inside the component. | |

**User's choice:** Delegated to Claude; provider-namespaced immutable key selected.
**Notes:** Convex Auth, Clerk, and Better Auth extraction stays in host adapters. Current provider helper details must be revalidated during research/planning.

### Actor snapshot and refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Display-only, mutation-refreshed snapshot | Store optional name/avatar, omit email, and refresh from verified facts on participation mutations. | ✓ |
| Rich provider snapshot | Store email and additional claims for future features. | |
| Explicit-only synchronization | Require a separate host sync operation to update display information. | |

**User's choice:** Delegated to Claude; display-only, mutation-refreshed snapshot selected.
**Notes:** Reads never upsert or mutate actors. The no-email default minimizes PII and is additive if a concrete future need emerges.

### Deletion and historical attribution

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit anonymization with retained history | Clear PII, tombstone the external key, and retain authored content and votes. | ✓ |
| Hard-delete actor participation | Remove the actor, content, votes, and resulting counts. | |
| Retain linkable identity | Hide display fields but preserve the original external key indefinitely. | |

**User's choice:** Delegated to Claude; explicit anonymization with retained history selected.
**Notes:** The component cannot infer host deletion. Re-registration creates a new actor, anonymized authors receive a generic label, and content withdrawal remains a separate operation.

### Account linking

| Option | Description | Selected |
|--------|-------------|----------|
| Defer linking and actor merge | A new provider subject creates a new actor in v1. | ✓ |
| Automatic cross-provider linking | Attempt to merge identities using common claims such as email. | |
| Component-owned identity graph | Add linking and provider-account membership to the Phase 1 schema. | |

**User's choice:** Delegated to Claude; linking and actor merge deferred.
**Notes:** One installation uses one host auth configuration. Cross-provider identity evolution is future work and must not expand Phase 1.

## Claude-Delegated Discretion

- No email is stored in v1 because no Phase 1 feature requires it and host-owned delivery retains contact data.
- Anonymized votes and comments remain counted to preserve history and counter integrity.
- Demo scope is derived one-way from verified identity so the scope value itself carries no raw PII.
- Anonymization is explicitly host-invoked because component isolation prevents observing host-user deletion.

## Deferred Ideas

- Cross-provider account linking and actor merge.
- Email or contact PII storage in the component.
- Phase 4 sandbox seed, reset, quota, expiry, and cleanup implementation.
- Phase 2 rate limiting, moderation state, and safe-content behavior.
