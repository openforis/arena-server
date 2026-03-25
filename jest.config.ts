import type { Config } from 'jest'

const config: Config = {
  roots: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  verbose: true,
  transform: { '^.+\\.[jt]s$': 'ts-jest' },
  transformIgnorePatterns: ['/node_modules/(?!(change-case|uuid|otplib|@otplib|@scure/base|@noble)/)'],
}

export default config
