type Matcher = string | RegExp | ((str: string) => boolean);

const isString = (str: unknown): str is string => typeof str === 'string';
const isRegExp = (str: unknown): str is RegExp => str instanceof RegExp;
const isPredicate = (str: unknown): str is (str: string) => boolean =>
  typeof str === 'function';

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
