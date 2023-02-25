/** Used for identifiers. If the name is illegal Typescript, put it in quotes. */
const escapeName = (name: string): string => {
  let isLegalIdentifier = true;

  if (name.length === 0 || name.trim() !== name) {
    isLegalIdentifier = false;
  }

  try {
    new Function('var ' + name);
  } catch {
    isLegalIdentifier = false;
  }

  return isLegalIdentifier ? name : `'${name}'`;
};

export default escapeName;
