type Predicate = (str: string) => boolean;
type Matcher = string | RegExp | Predicate;

const isString = (input: unknown): input is string => typeof input === "string";
const isRegExp = (input: unknown): input is RegExp => input instanceof RegExp;
const isPredicate = (input: unknown): input is Predicate =>
  typeof input === "function";

export const isMatch = (str: string, matcher: Matcher): boolean => {
  if (isString(matcher)) {
    return str === matcher;
  }

  if (isRegExp(matcher)) {
    return matcher.test(str);
  }

  if (isPredicate(matcher)) {
    return matcher(str);
  }

  return false;
};

export default Matcher;
