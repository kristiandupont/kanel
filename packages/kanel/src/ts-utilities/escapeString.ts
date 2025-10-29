/** Used for single-quoted strings. */
const escapeString = (name: string): string =>
  name.replaceAll("'", "\\'").replaceAll("\n", "\\n");

export default escapeString;
