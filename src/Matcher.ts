type Matcher = string | RegExp | ((str: string) => boolean);

const isString = (str: any): str is string => typeof str === 'string';
const isRegExp = (str: any): str is RegExp => str instanceof RegExp;
const isFunction = (str: any): str is (str: string) => boolean =>
  typeof str === 'function';

export const isMatch = (str: string, matcher: Matcher): boolean => {
  if (isString(matcher)) {
    return str === matcher;
  }

  if (isRegExp(matcher)) {
    return matcher.test(str);
  }

  if (isFunction(matcher)) {
    return matcher(str);
  }

  return false;
};

export default Matcher;
