import process from 'node:process';
import pino, { type Logger } from 'pino';

let logger: Logger = pino({
    base: { hostname: undefined, pid: undefined }, // This will remove pid and hostname but keep time
    level: process.env.LOG_LEVEL || 'debug',
});

if (process.env.NODE_ENV === 'test') {
    logger = {
        debug: console.debug,
        error: console.error,
        fatal: console.error,
        info: console.info,
        level: 'debug',
        warn: console.warn,
    } as Logger;
}

export default logger;
