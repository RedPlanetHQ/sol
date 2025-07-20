import type { Config } from './config.interface';

export const config: Config = {
  cors: {
    enabled: true,
  },
  log: {
    level: process.env.LOG_LEVEL,
    createLogFile: process.env.CREATE_LOG_FILE === 'true',
  },
};

export default (): Config => config;
