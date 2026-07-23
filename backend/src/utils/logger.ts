import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Garante que o diretório de logs exista antes de criar os transports
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato legível para arquivo
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return stack
      ? `[${ts}] ${level.toUpperCase()}: ${message}\n${stack}${metaStr}`
      : `[${ts}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// Formato colorido para console (apenas em dev)
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts }) => `${ts} ${level}: ${message}`)
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  transports: [
    // Todos os logs — app.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB por arquivo
      maxFiles: 5,               // mantém até 5 rotações
      tailable: true,
    }),
    // Apenas erros — error.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Console apenas fora de produção
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}
