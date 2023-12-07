import { recase } from "@kristiandupont/recase";

const toPascalCase = recase(null, "pascal");

/** Used for identifiers. If the name has symbols or is illegal Typescript, strip out symbols and make it PascalCase. */
// NB: A wider set of things than are accepted by this function are valid identifiers in TypeScript (see https://stackoverflow.com/a/9337047). However, this works well for our purposes.
const escapeIdentifier = (name: string): string => {
  const trimmed = name.trim();
  let isLegalIdentifier = true;

  if (!/^[$A-Z_a-z][\w$]*$/.test(trimmed)) {
    isLegalIdentifier = false;
  }
  try {
    new Function(`const ${trimmed} = 1;`);
  } catch {
    isLegalIdentifier = false;
  }

  if (isLegalIdentifier) {
    return trimmed;
  }

  const snaked = trimmed.replaceAll(/[^$A-Z_a-z]/g, "_").replaceAll(/_+/g, "_");
  const result = toPascalCase(snaked);

  if (result.length === 0) {
    throw new Error(`Invalid and unsalvageable identifier: ${name}`);
  }

  return result;
};

export default escapeIdentifier;
