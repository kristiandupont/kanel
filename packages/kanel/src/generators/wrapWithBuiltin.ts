/**
 * Wrapper utilities to combine user-provided V4 functions with builtin implementations.
 *
 * These wrappers ensure that:
 * 1. Builtin function is called first to get the base result
 * 2. User function (if provided) receives the builtin result to compose on
 * 3. If no user function, builtin is used directly
 */

import type {
  GetMetadataV4,
  GetPropertyMetadataV4,
  GenerateIdentifierTypeV4,
  GetRoutineMetadataV4,
} from "../config-types-v4";
import type {
  InternalGetMetadata,
  InternalGetPropertyMetadata,
  InternalGenerateIdentifierType,
  InternalGetRoutineMetadata,
} from "./pgTsGeneratorContext";
import {
  defaultGetMetadata,
  defaultGetPropertyMetadata,
  defaultGenerateIdentifierType,
  defaultGetRoutineMetadata,
} from "../default-metadata-generators";
import { useKanelContext } from "../context";

/**
 * Wraps getMetadata to call builtin first, then user function.
 * Returns an InternalGetMetadata function (without the builtinMetadata parameter).
 */
export function wrapGetMetadata(
  userFunction: GetMetadataV4 | undefined,
): InternalGetMetadata {
  return (details, generateFor) => {
    const context = useKanelContext();

    // Call builtin - it will get outputPath from context itself
    // Pass instantiatedConfig for V3 compat (it's optional/undefined in V4)
    const builtinResult = defaultGetMetadata(
      details,
      generateFor,
      context.instantiatedConfig as any,
    );

    // If user provided a function, call it with builtin result
    if (userFunction) {
      return userFunction(details, generateFor, builtinResult);
    }

    // Otherwise use builtin directly
    return builtinResult;
  };
}

/**
 * Wraps getPropertyMetadata to call builtin first, then user function.
 * Returns an InternalGetPropertyMetadata function (without the builtinMetadata parameter).
 */
export function wrapGetPropertyMetadata(
  userFunction: GetPropertyMetadataV4 | undefined,
): InternalGetPropertyMetadata {
  return (property, details, generateFor) => {
    const context = useKanelContext();

    // Call builtin - pass instantiatedConfig for V3 compat (it's optional/undefined in V4)
    const builtinResult = defaultGetPropertyMetadata(
      property,
      details,
      generateFor,
      context.instantiatedConfig,
    );

    if (userFunction) {
      return userFunction(property, details, generateFor, builtinResult);
    }

    return builtinResult;
  };
}

/**
 * Wraps generateIdentifierType to call builtin first, then user function.
 * Returns an InternalGenerateIdentifierType function (without the builtinType parameter).
 */
export function wrapGenerateIdentifierType(
  userFunction: GenerateIdentifierTypeV4 | undefined,
): InternalGenerateIdentifierType | undefined {
  if (!userFunction) {
    // Return a wrapper around the builtin
    return (column, details) => {
      const context = useKanelContext();

      return defaultGenerateIdentifierType(
        column,
        details,
        context.instantiatedConfig as any,
      );
    };
  }

  return (column, details) => {
    const context = useKanelContext();

    const builtinResult = defaultGenerateIdentifierType(
      column,
      details,
      context.instantiatedConfig,
    );

    return userFunction(column, details, builtinResult);
  };
}

/**
 * Wraps getRoutineMetadata to call builtin first, then user function.
 * Returns an InternalGetRoutineMetadata function (without the builtinMetadata parameter).
 */
export function wrapGetRoutineMetadata(
  userFunction: GetRoutineMetadataV4 | undefined,
): InternalGetRoutineMetadata | undefined {
  if (!userFunction) {
    // Return a wrapper around the builtin
    return (routineDetails) => {
      const context = useKanelContext();

      // Call builtin - it will get outputPath from context itself
      return defaultGetRoutineMetadata(
        routineDetails,
        context.instantiatedConfig,
      );
    };
  }

  return (routineDetails) => {
    const context = useKanelContext();

    const builtinResult = defaultGetRoutineMetadata(
      routineDetails,
      context.instantiatedConfig,
    );

    return userFunction(routineDetails, builtinResult);
  };
}
