// @ts-expect-error React declarations are supplied by strict consumer fixtures.
import { useEffect, useRef, useState } from "react";

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

export function useMutationController(sessionKey: string) {
  const [pending, setPending] = useState({} as Record<string, boolean>);
  const [errors, setErrors] = useState(
    {} as Record<string, AfferentError | undefined>,
  );
  const inFlight = useRef(new Set<string>());
  const retryActions = useRef(
    new Map<string, () => Promise<AfferentResult<unknown>>>(),
  );

  useEffect(() => {
    inFlight.current.clear();
    retryActions.current.clear();
    setPending({});
    setErrors({});
  }, [sessionKey]);

  async function run<T>(
    key: string,
    invoke: () => Promise<T | AfferentResult<T>>,
    unavailable?: AfferentError,
  ): Promise<AfferentResult<T>> {
    if (inFlight.current.has(key)) {
      return { ok: false, error: duplicateMutationError() };
    }
    if (unavailable) return { ok: false, error: unavailable };

    inFlight.current.add(key);
    retryActions.current.delete(key);
    setPending((current: Record<string, boolean>) => ({
      ...current,
      [key]: true,
    }));
    setErrors((current: Record<string, AfferentError | undefined>) => ({
      ...current,
      [key]: undefined,
    }));
    try {
      const result = normalizeAfferentResult(await invoke());
      if (!result.ok) {
        const mapped = mapAfferentError(result.error);
        setErrors((current: Record<string, AfferentError | undefined>) => ({
          ...current,
          [key]: mapped,
        }));
        if (isRetryableAfferentError(mapped)) {
          retryActions.current.set(
            key,
            () =>
              run(key, invoke, unavailable) as Promise<AfferentResult<unknown>>,
          );
        }
        return { ok: false, error: mapped };
      }
      return result;
    } catch (error) {
      const mapped = mapAfferentError(error);
      setErrors((current: Record<string, AfferentError | undefined>) => ({
        ...current,
        [key]: mapped,
      }));
      if (isRetryableAfferentError(mapped)) {
        retryActions.current.set(
          key,
          () =>
            run(key, invoke, unavailable) as Promise<AfferentResult<unknown>>,
        );
      }
      return { ok: false, error: mapped };
    } finally {
      inFlight.current.delete(key);
      setPending((current: Record<string, boolean>) => ({
        ...current,
        [key]: false,
      }));
    }
  }

  async function retry(key: string) {
    const action = retryActions.current.get(key);
    const error = errors[key];
    if (!action || !error || !isRetryableAfferentError(error)) return undefined;
    const delay = retryDelayMs(error);
    if (delay > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
    return await action();
  }

  return {
    pending,
    errors,
    run,
    retry,
    reset(key: string) {
      retryActions.current.delete(key);
      setErrors((current: Record<string, AfferentError | undefined>) => ({
        ...current,
        [key]: undefined,
      }));
    },
  };
}
