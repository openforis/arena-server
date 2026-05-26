const dbUrl = process.env.DATABASE_URL

const regExDbUrl = /postgres:\/\/(\w+):(\w+)@([\w.\d]+):(\d+)\/(\w+)/

const dbUrlMatch = dbUrl ? dbUrl.match(regExDbUrl) : null

const [pgUser, pgPassword, pgHost, pgPort, pgDatabase] = dbUrlMatch
  ? [dbUrlMatch[1], dbUrlMatch[2], dbUrlMatch[3], dbUrlMatch[4], dbUrlMatch[5]]
  : [process.env.PGUSER, process.env.PGPASSWORD, process.env.PGHOST, process.env.PGPORT, process.env.PGDATABASE]

const isTrue = (val: any): boolean => String(val).toLocaleLowerCase() === 'true' || String(val) === '1'

const getJson = (val: string | undefined): unknown => {
  if (!val) return undefined
  try {
    return JSON.parse(String(val))
  } catch {
    return undefined
  }
}

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

export const ProcessEnv = {
  arenaRoot: process.env.ARENA_ROOT,
  arenaDist: process.env.ARENA_DIST,
  arenaPort: process.env.PORT || process.env.ARENA_PORT || '9090',

  debug: process.env.DEBUG === 'true',
  nodeEnv: process.env.NODE_ENV || NodeEnv.development,
  tempFolder: process.env.TEMP_FOLDER || '/tmp/arena_upload',
  buildReport: isTrue(process.env.BUILD_REPORT),

  // Application Version
  applicationVersion: process.env.APP_VERSION ?? '2.0.0',

  // DB
  dbUrl,
  pgUser,
  pgPassword,
  pgHost,
  pgPort: Number(pgPort),
  pgDatabase,
  pgSsl: isTrue(process.env.PGSSL),
  pgSslAllowUnauthorized: isTrue(process.env.PGSSL_ALLOW_UNAUTHORIZED),
  disableDbMigrations: isTrue(process.env.DISABLE_DB_MIGRATIONS),

  // Express
  useHttps: isTrue(process.env.USE_HTTPS),
  fileUploadLimit: Number(process.env.FILE_UPLOAD_LIMIT) || 1024 ** 3, // 1GB

  // Rate limiting
  rateLimitEnabled: isTrue(process.env.RATE_LIMIT_ENABLED),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitRequestsPerWindow: Number(process.env.RATE_LIMIT_REQUESTS_PER_WINDOW) || 100, // limit each IP to 100 requests per windowMs

  // Logging
  disableLogging: process.env.NODE_ENV === 'test' && isTrue(process.env.DISABLE_LOGS),

  // RStudio Server
  rStudioDownloadServerUrl: process.env.RSTUDIO_DOWNLOAD_SERVER_URL,
  rStudioServerUrl: process.env.RSTUDIO_SERVER_URL,
  rStudioPoolServerURL: process.env.RSTUDIO_POOL_SERVER_URL,
  rStudioPoolServiceKey: process.env.RSTUDIO_POOL_SERVICE_KEY,

  // ReCaptcha
  reCaptchaEnabled: isTrue(process.env.RECAPTCHA_ENABLED),
  reCaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
  reCaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY,

  // Map
  mapApiKeyPlanet: process.env.MAP_API_KEY_PLANET,

  // Security
  userAuthTokenSecret: process.env.USER_AUTH_TOKEN_SECRET || 'user-auth-token-secret',
  user2FASecret: process.env.USER_2FA_SECRET || 'user-2fa-secret',

  // SYSTEM ADMIN USER
  // - admin email address
  //   used to create default system admin user when DB is empty
  //   and to send emails to the users)
  adminEmail: process.env.ADMIN_EMAIL,
  // - admin user password
  adminPassword: process.env.ADMIN_PASSWORD,
  allowUserAccessRequest: isTrue(process.env.ALLOW_USER_ACCESS_REQUEST ?? 'true'),

  // FILE STORAGE
  fileStoragePath: process.env.FILE_STORAGE_PATH,
  fileStorageAwsAccessKey: process.env.FILE_STORAGE_AWS_ACCESS_KEY,
  fileStorageAwsSecretAccessKey: process.env.FILE_STORAGE_AWS_SECRET_ACCESS_KEY,
  fileStorageAwsS3BucketName: process.env.FILE_STORAGE_AWS_S3_BUCKET_NAME,
  fileStorageAwsS3BucketRegion: process.env.FILE_STORAGE_AWS_S3_BUCKET_REGION,
  // Job queue
  jobQueueConcurrency: process.env.JOB_QUEUE_CONCURRENCY || 3,
  // WHISP
  whispApiKey: process.env.WHISP_API_KEY,
  // Activity log
  activityLogDisabled: isTrue(process.env.ACTIVITY_LOG_DISABLED),
  // Experimental features
  experimentalFeatures: isTrue(process.env.EXPERIMENTAL_FEATURES),

  // ===== AI =====
  // Master kill switch for all AI features
  aiFeaturesEnabled: isTrue(process.env.AI_FEATURES_ENABLED ?? 'false'),
  // Per-feature flags as a JSON object, e.g.
  // {"translation":true,"expressionGenerate":true,"expressionExplain":true,"activityLogSummary":true,"dataDictionary":true}
  aiFeatureFlags: getJson(process.env.AI_FEATURE_FLAGS),
  // Default provider (used when user has no override)
  aiDefaultProvider: process.env.AI_DEFAULT_PROVIDER, // openai | anthropic | google | openai-compatible
  aiDefaultModel: process.env.AI_DEFAULT_MODEL,
  aiDefaultApiKey: process.env.AI_DEFAULT_API_KEY,
  aiDefaultBaseUrl: process.env.AI_DEFAULT_BASE_URL,
  // Master encryption key for user-stored API keys (32-byte hex)
  aiUserKeyEncryptionSecret: process.env.AI_USER_KEY_ENCRYPTION_SECRET,
  // Limits
  aiMaxPromptChars: Number(process.env.AI_MAX_PROMPT_CHARS) || 200000,
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 60000,
}
