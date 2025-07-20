export interface Config {
  cors: CorsConfig;
  log: LogConfigs;
}

export interface LogConfigs {
  level: string;
  createLogFile?: boolean;
}

export interface CorsConfig {
  enabled: boolean;
}
