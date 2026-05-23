const levels = ['error', 'warn', 'info', 'debug'];
const levelRank = new Map(levels.map((level, index) => [level, index]));
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const minLevel = levelRank.has(configuredLevel) ? levelRank.get(configuredLevel) : levelRank.get('info');

function serializeArg(arg) {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack
    };
  }

  if (typeof arg === 'string') {
    return arg;
  }

  return arg;
}

function write(level, args) {
  if (!levelRank.has(level) || levelRank.get(level) > minLevel) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: args.map(serializeArg)
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

module.exports = {
  error: (...args) => write('error', args),
  warn: (...args) => write('warn', args),
  info: (...args) => write('info', args),
  debug: (...args) => write('debug', args)
};
