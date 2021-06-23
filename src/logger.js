/* eslint-disable no-console */
const LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  quiet: 3,
  log: 4,
};

const options = {
  level: LEVELS.log,
};

function createLogger(level, method, exact = false) {
  return function (first, ...rest) {
    if (level > options.level || (exact && options.level !== level)) return;
    if (first.raw) {
      console[method](String.raw(first, ...rest));
    } else {
      console[method](first, ...rest);
    }
  };
}

export const log = createLogger(LEVELS.log, 'log', true);
export const quiet = createLogger(LEVELS.quiet, 'log', true);
export const warn = createLogger(LEVELS.warn, 'warn');
export const error = createLogger(LEVELS.error, 'error');

/**
 * @param {{ level: keyof LEVELS | 0 | 1 | 2 | 3 }} config
 *  */
export function logger(config) {
  switch (typeof config.level) {
    case 'string': {
      options.level = LEVELS[config.level.toLowerCase()];
      break;
    }
    case 'number': {
      options.level = config.level;
      break;
    }
    case 'boolean': {
      options.level = config.level ? LEVELS.log : LEVELS.silent;
      break;
    }
  }
}

logger.log = log;
logger.warn = warn;
logger.error = error;
logger.quiet = quiet;
