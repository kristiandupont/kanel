/** Used for comment text. */
const escapeComment = (name: string): string =>
  name.replaceAll("*/", "*\\/").replaceAll("\n", "\\n");

export default escapeComment;
