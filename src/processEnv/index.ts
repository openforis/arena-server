import path from 'node:path'

const isTrue = (val: any): boolean => String(val).toLocaleLowerCase() === 'true' || String(val) === '1'

const getJson = (val: string | undefined): unknown => {
  if (!val) return undefined
  try {
    return JSON.parse(String(val))
  } catch {
    return undefined
  }
}

const decodeURIComponentSafe = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const parseDbUrl = (
  dbUrl: string | undefined
):
  | {
      pgUser?: string
      pgPassword?: string
      pgHost?: string
      pgPort?: string
      pgDatabase?: string
    }
  | undefined => {
  if (!dbUrl) return undefined

  try {
    const url = new URL(dbUrl)
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return undefined

    const dbPath = url.pathname.replace(/^\/+/, '')

    return {
      pgUser: url.username ? decodeURIComponentSafe(url.username) : undefined,
      pgPassword: url.password ? decodeURIComponentSafe(url.password) : undefined,
      pgHost: url.hostname ? url.hostname.replace(/^\[(.*)]$/, '$1') : undefined,
      pgPort: url.port || undefined,
      pgDatabase: dbPath ? decodeURIComponentSafe(dbPath) : undefined,
    }
  } catch {
    const fallbackMatch = dbUrl.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@(\[[^\]]+]|[^:/?#]+)(?::(\d+))?\/([^?#]+)/i)

    if (!fallbackMatch) return undefined

    return {
      pgUser: decodeURIComponentSafe(fallbackMatch[1]),
      pgPassword: decodeURIComponentSafe(fallbackMatch[2]),
      pgHost: fallbackMatch[3].replace(/^\[(.*)]$/, '$1'),
      pgPort: fallbackMatch[4],
      pgDatabase: decodeURIComponentSafe(fallbackMatch[5]),
    }
  }
}

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

export const buildProcessEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const dbUrl = env.DATABASE_URL
  const parsedDbUrl = parseDbUrl(dbUrl)
  const pgUser = parsedDbUrl?.pgUser ?? env.PGUSER
  const pgPassword = parsedDbUrl?.pgPassword ?? env.PGPASSWORD
  const pgHost = parsedDbUrl?.pgHost ?? env.PGHOST
  const pgPort = parsedDbUrl?.pgPort ?? env.PGPORT
  const pgDatabase = parsedDbUrl?.pgDatabase ?? env.PGDATABASE

  const fileStorageAwsAccessKey = env.FILE_STORAGE_AWS_ACCESS_KEY
  const fileStorageAwsSecretAccessKey = env.FILE_STORAGE_AWS_SECRET_ACCESS_KEY
  const fileStorageAwsS3BucketName = env.FILE_STORAGE_AWS_S3_BUCKET_NAME
  const fileStorageAwsS3BucketRegion = env.FILE_STORAGE_AWS_S3_BUCKET_REGION
  const fileStorageAwsEnabled = Boolean(
    fileStorageAwsAccessKey &&
    fileStorageAwsSecretAccessKey &&
    fileStorageAwsS3BucketName &&
    fileStorageAwsS3BucketRegion
  )

  return {
    arenaRoot: env.ARENA_ROOT,
    arenaDist: env.ARENA_DIST,
    arenaPort: env.PORT || env.ARENA_PORT || '9090',

    debug: env.DEBUG === 'true',
    nodeEnv: env.NODE_ENV || NodeEnv.development,
    tempFolder: env.TEMP_FOLDER || path.resolve('.tmp/arena_upload'),
    buildReport: isTrue(env.BUILD_REPORT),

    // Application Version
    applicationVersion: env.APP_VERSION ?? '2.0.0',

    // DB
    dbUrl,
    pgUser,
    pgPassword,
    pgHost,
    pgPort: Number(pgPort),
    pgDatabase,
    pgSsl: isTrue(env.PGSSL),
    pgSslAllowUnauthorized: isTrue(env.PGSSL_ALLOW_UNAUTHORIZED),
    pgConnectionTimeoutMillis: Number.isFinite(Number(env.PG_CONNECTION_TIMEOUT_MILLIS))
      ? Number(env.PG_CONNECTION_TIMEOUT_MILLIS)
      : 30000,
    disableDbMigrations: isTrue(env.DISABLE_DB_MIGRATIONS),

    // Express
    useHttps: isTrue(env.USE_HTTPS),
    fileUploadLimit: Number(env.FILE_UPLOAD_LIMIT) || 1024 ** 3,

    // Email
    emailService: env.EMAIL_SERVICE || 'sendgrid',
    emailFrom: env.EMAIL_FROM,
    emailAuthUser: env.EMAIL_AUTH_USER,
    emailAuthPassword: env.EMAIL_AUTH_PASSWORD,
    emailTransportOptions: getJson(env.EMAIL_TRANSPORT_OPTIONS),
    sendGridApiKey: env.SENDGRID_API_KEY,
    emailAmazonSESHost: env.EMAIL_AMAZON_SES_HOST,
    emailAmazonSESPort: Number(env.EMAIL_AMAZON_SES_PORT) || 465,

    // Analysis
    analysisOutputDir: env.ANALYSIS_OUTPUT_DIR,

    // Rate limiting
    rateLimitEnabled: isTrue(env.RATE_LIMIT_ENABLED),
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitRequestsPerWindow: Number(env.RATE_LIMIT_REQUESTS_PER_WINDOW) || 100,

    // Logging
    disableLogging: env.NODE_ENV === 'test' && isTrue(env.DISABLE_LOGS),
    logFolder: env.LOG_FOLDER || env.LOG_DIR || env.LOGS_FOLDER || './logs',
    logMaxSizeBytes: Number(env.LOG_MAX_SIZE_BYTES) || 10 * 1024 * 1024,
    logRetentionDays: Number(env.LOG_RETENTION_DAYS) || 30,
    logUploadIntervalMs: Number(env.LOG_UPLOAD_INTERVAL_MS) || 60 * 1000,
    logS3Prefix: env.LOG_S3_PREFIX || 'logs',
    fileStorageAwsEnabled,
    logS3Enabled: fileStorageAwsEnabled,

    // RStudio Server
    rStudioDownloadServerUrl: env.RSTUDIO_DOWNLOAD_SERVER_URL,
    rStudioServerUrl: env.RSTUDIO_SERVER_URL,
    rStudioPoolServerURL: env.RSTUDIO_POOL_SERVER_URL,
    rStudioPoolServiceKey: env.RSTUDIO_POOL_SERVICE_KEY,

    // ReCaptcha
    reCaptchaEnabled: isTrue(env.RECAPTCHA_ENABLED),
    reCaptchaSiteKey: env.RECAPTCHA_SITE_KEY,
    reCaptchaSecretKey: env.RECAPTCHA_SECRET_KEY,

    // Map
    mapApiKeyPlanet: env.MAP_API_KEY_PLANET,

    // Security
    userAuthTokenSecret: env.USER_AUTH_TOKEN_SECRET || 'user-auth-token-secret',
    user2FASecret: env.USER_2FA_SECRET || 'user-2fa-secret',

    // SYSTEM ADMIN USER
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    allowUserAccessRequest: isTrue(env.ALLOW_USER_ACCESS_REQUEST ?? 'true'),

    // File storage
    fileStoragePath: env.FILE_STORAGE_PATH,
    fileStorageAwsAccessKey,
    fileStorageAwsSecretAccessKey,
    fileStorageAwsS3BucketName,
    fileStorageAwsS3BucketRegion,

    // Job queue
    jobQueueConcurrency: env.JOB_QUEUE_CONCURRENCY || 3,

    // WHISP
    whispApiKey: env.WHISP_API_KEY,

    // Activity log
    activityLogDisabled: isTrue(env.ACTIVITY_LOG_DISABLED),

    // Experimental features
    experimentalFeatures: isTrue(env.EXPERIMENTAL_FEATURES),

    // ===== AI =====
    aiFeaturesEnabled: isTrue(env.AI_FEATURES_ENABLED ?? 'false'),
    aiFeatureFlags: getJson(env.AI_FEATURE_FLAGS),
    aiDefaultProvider: env.AI_DEFAULT_PROVIDER,
    aiDefaultModel: env.AI_DEFAULT_MODEL,
    aiDefaultApiKey: env.AI_DEFAULT_API_KEY,
    aiDefaultBaseUrl: env.AI_DEFAULT_BASE_URL,
    aiUserKeyEncryptionSecret: env.AI_USER_KEY_ENCRYPTION_SECRET,
    aiMaxPromptChars: Number(env.AI_MAX_PROMPT_CHARS) || 200000,
    aiRequestTimeoutMs: Number(env.AI_REQUEST_TIMEOUT_MS) || 60000,
  }
}

export const ProcessEnv = buildProcessEnv()
