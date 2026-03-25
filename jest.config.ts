import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]sx?$': 'ts-jest' },
  transformIgnorePatterns: ['/node_modules/(?!(change-case|uuid)/)'],
}

export default config
