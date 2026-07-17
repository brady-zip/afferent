// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useRef, useState } from "react";

import type {
  AfferentError,
  AfferentErrorDto,
  AfferentResult,
} from "../../client/contracts.js";

const ERROR_CODES = new Set<AfferentErrorDto["code"]>([
  "AUTHENTICATION_REQUIRED",
  "VALIDATION",
  "NOT_FOUND",
  "DISCUSSION_LOCKED",
  "NOT_AUTHORIZED",
  "CONFLICT",
  "TRANSIENT",
  "UNKNOWN",
]);

function errorPayload(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) return {};
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.data === "object" && candidate.data !== null) {
    return candidate.data as Record<string, unknown>;
  }
  return candidate;
}

export function mapAfferentError(error: unknown): AfferentError {
  const value = errorPayload(error);
  if (value.code === "RATE_LIMITED") {
    const retryAfterMs = Math.max(0, Number(value.retryAfterMs ?? 0));
    return {
      contractVersion: 1,
      code: "RATE_LIMITED",
      operation: [
        "create_post",
        "edit_post",
        "comment",
        "vote",
        "subscribe",
      ].includes(String(value.operation))
        ? (value.operation as Extract<
            AfferentErrorDto,
            { code: "RATE_LIMITED" }
          >["operation"])
        : "comment",
      retryAfterMs,
      retryAt: Date.now() + retryAfterMs,
    };
  }

  let message = "Afferent request failed";
  if (typeof value.message === "string") message = value.message;
  else if (error instanceof Error) message = error.message;
  const networkFailure =
    error instanceof TypeError || /fetch|network|offline/i.test(message);
  let code: Exclude<AfferentErrorDto["code"], "RATE_LIMITED"> = "UNKNOWN";
  if (ERROR_CODES.has(value.code as AfferentErrorDto["code"])) {
    code = value.code as Exclude<AfferentErrorDto["code"], "RATE_LIMITED">;
  } else if (networkFailure) {
    code = "TRANSIENT";
  }
  return {
    contractVersion: 1,
    code,
    message,
    ...(typeof value.field === "string" ? { field: value.field } : {}),
  };
}

export function normalizeAfferentResult<T>(
  value: T | AfferentResult<T>,
): AfferentResult<T> {
  if (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value.ok === true || value.ok === false)
  ) {
    return value as AfferentResult<T>;
  }
  return { ok: true, data: value as T };
}

export function isRetryableAfferentError(error: AfferentError): boolean {
  return error.code === "TRANSIENT" || error.code === "RATE_LIMITED";
}

export function retryDelayMs(error: AfferentError): number {
  return error.code === "RATE_LIMITED" ? error.retryAfterMs : 0;
}

export function duplicateMutationError(): AfferentError {
  return {
    contractVersion: 1,
    code: "VALIDATION",
    message: "Request already pending",
  };
}

interface MutationControllerState {
  generation: number;
  pending: Record<string, boolean>;
  errors: Record<string, AfferentError | undefined>;
}

interface RetryAction {
  generation: number;
  invoke: () => Promise<AfferentResult<unknown>>;
}

const EMPTY_PENDING: Record<string, boolean> = {};
const EMPTY_ERRORS: Record<string, AfferentError | undefined> = {};

export function useMutationController(generation: number) {
  const currentGeneration = useRef(generation);
  currentGeneration.current = generation;
  const [state, setState] = useState(
    (): MutationControllerState => ({
      generation,
      pending: {},
      errors: {},
    }),
  );
  const inFlight = useRef(new Set<string>());
  const retryActions = useRef(new Map<string, RetryAction>());

  const pending = state.generation === generation ? state.pending : EMPTY_PENDING;
  const errors = state.generation === generation ? state.errors : EMPTY_ERRORS;

  function write(
    capturedGeneration: number,
    update: (current: MutationControllerState) => MutationControllerState,
  ) {
    if (currentGeneration.current !== capturedGeneration) return;
    setState((current: MutationControllerState) => {
      if (currentGeneration.current !== capturedGeneration) return current;
      const owned =
        current.generation === capturedGeneration
          ? current
          : { generation: capturedGeneration, pending: {}, errors: {} };
      return update(owned);
    });
  }

  async function run<T>(
    key: string,
    invoke: () => Promise<T | AfferentResult<T>>,
    unavailable?: AfferentError,
  ): Promise<AfferentResult<T>> {
    const capturedGeneration = generation;
    const ownedKey = `${capturedGeneration}:${key}`;
    if (currentGeneration.current !== capturedGeneration) {
      return {
        ok: false,
        error: {
          contractVersion: 1,
          code: "NOT_AUTHORIZED",
          message: "Identity changed before the request started",
        },
      };
    }
    if (inFlight.current.has(ownedKey)) {
      return { ok: false, error: duplicateMutationError() };
    }
    if (unavailable) return { ok: false, error: unavailable };

    inFlight.current.add(ownedKey);
    retryActions.current.delete(key);
    write(capturedGeneration, (current) => ({
      ...current,
      pending: { ...current.pending, [key]: true },
      errors: { ...current.errors, [key]: undefined },
    }));
    try {
      const result = normalizeAfferentResult(await invoke());
      if (!result.ok) {
        const mapped = mapAfferentError(result.error);
        write(capturedGeneration, (current) => ({
          ...current,
          errors: { ...current.errors, [key]: mapped },
        }));
        if (
          currentGeneration.current === capturedGeneration &&
          isRetryableAfferentError(mapped)
        ) {
          retryActions.current.set(key, {
            generation: capturedGeneration,
            invoke: () =>
              run(key, invoke, unavailable) as Promise<AfferentResult<unknown>>,
          });
        }
        return { ok: false, error: mapped };
      }
      return result;
    } catch (error) {
      const mapped = mapAfferentError(error);
      write(capturedGeneration, (current) => ({
        ...current,
        errors: { ...current.errors, [key]: mapped },
      }));
      if (
        currentGeneration.current === capturedGeneration &&
        isRetryableAfferentError(mapped)
      ) {
        retryActions.current.set(key, {
          generation: capturedGeneration,
          invoke: () =>
            run(key, invoke, unavailable) as Promise<AfferentResult<unknown>>,
        });
      }
      return { ok: false, error: mapped };
    } finally {
      inFlight.current.delete(ownedKey);
      write(capturedGeneration, (current) => ({
        ...current,
        pending: { ...current.pending, [key]: false },
      }));
    }
  }

  async function retry(key: string) {
    const action = retryActions.current.get(key);
    const error = errors[key];
    if (
      !action ||
      action.generation !== generation ||
      currentGeneration.current !== generation ||
      !error ||
      !isRetryableAfferentError(error)
    ) {
      return undefined;
    }
    const delay = retryDelayMs(error);
    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
    if (
      currentGeneration.current !== action.generation ||
      retryActions.current.get(key) !== action
    ) {
      return undefined;
    }
    return await action.invoke();
  }

  return {
    pending,
    errors,
    run,
    retry,
    reset(key: string) {
      retryActions.current.delete(key);
      write(generation, (current) => ({
        ...current,
        errors: { ...current.errors, [key]: undefined },
      }));
    },
  };
}
