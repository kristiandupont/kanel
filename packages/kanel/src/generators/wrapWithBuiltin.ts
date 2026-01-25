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
  userFunction: GetMetadataV4 | undefined
): InternalGetMetadata {
  return (details, generateFor) => {
    const context = useKanelContext();

    // For V3 compat, we need instantiatedConfig
    // For pure V4, we'd build this from context
    const instantiatedConfig = context.instantiatedConfig;
    if (!instantiatedConfig) {
      throw new Error(
        "Cannot call builtin metadata functions without instantiatedConfig. " +
          "This should not happen - V4 pure mode is not yet implemented."
      );
    }

    // Call builtin to get base result
    const builtinResult = defaultGetMetadata(
      details,
      generateFor,
      instantiatedConfig
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
  userFunction: GetPropertyMetadataV4 | undefined
): InternalGetPropertyMetadata {
  return (property, details, generateFor) => {
    const context = useKanelContext();
    const instantiatedConfig = context.instantiatedConfig;
    if (!instantiatedConfig) {
      throw new Error(
        "Cannot call builtin metadata functions without instantiatedConfig."
      );
    }

    const builtinResult = defaultGetPropertyMetadata(
      property,
      details,
      generateFor,
      instantiatedConfig
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
  userFunction: GenerateIdentifierTypeV4 | undefined
): InternalGenerateIdentifierType | undefined {
  if (!userFunction) {
    // Return a wrapper around the builtin
    return (column, details) => {
      const context = useKanelContext();
      const instantiatedConfig = context.instantiatedConfig;
      if (!instantiatedConfig) {
        throw new Error(
          "Cannot call builtin metadata functions without instantiatedConfig."
        );
      }

      return defaultGenerateIdentifierType(column, details, instantiatedConfig);
    };
  }

  return (column, details) => {
    const context = useKanelContext();
    const instantiatedConfig = context.instantiatedConfig;
    if (!instantiatedConfig) {
      throw new Error(
        "Cannot call builtin metadata functions without instantiatedConfig."
      );
    }

    const builtinResult = defaultGenerateIdentifierType(
      column,
      details,
      instantiatedConfig
    );

    return userFunction(column, details, builtinResult);
  };
}

/**
 * Wraps getRoutineMetadata to call builtin first, then user function.
 * Returns an InternalGetRoutineMetadata function (without the builtinMetadata parameter).
 */
export function wrapGetRoutineMetadata(
  userFunction: GetRoutineMetadataV4 | undefined
): InternalGetRoutineMetadata | undefined {
  if (!userFunction) {
    // Return a wrapper around the builtin
    return (routineDetails) => {
      const context = useKanelContext();
      const instantiatedConfig = context.instantiatedConfig;
      if (!instantiatedConfig) {
        throw new Error(
          "Cannot call builtin metadata functions without instantiatedConfig."
        );
      }

      return defaultGetRoutineMetadata(routineDetails, instantiatedConfig);
    };
  }

  return (routineDetails) => {
    const context = useKanelContext();
    const instantiatedConfig = context.instantiatedConfig;
    if (!instantiatedConfig) {
      throw new Error(
        "Cannot call builtin metadata functions without instantiatedConfig."
      );
    }

    const builtinResult = defaultGetRoutineMetadata(
      routineDetails,
      instantiatedConfig
    );

    return userFunction(routineDetails, builtinResult);
  };
}
