import type { Config } from 'jest'

const config: Config = {
  roots: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  verbose: true,
  transform: { '^.+\\.[jt]s$': 'ts-jest' },
  transformIgnorePatterns: [
    '/node_modules/(?!(change-case|uuid|otplib|@otplib|@scure/base|@noble|n2words|openid-client|oauth4webapi|jose)/)',
  ],
}

export default config
