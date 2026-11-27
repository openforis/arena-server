import type { Config } from 'jest'

const config: Config = {
  roots: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  verbose: true,
  transform: { '^.+\\.[jt]s$': 'ts-jest' },
  transformIgnorePatterns: [
    '/node_modules/(?!(change-case|uuid|otplib|@otplib|@scure/base|@noble|n2words|openid-client|oauth4webapi|jose|fontkit|restructure|unicode-properties|unicode-trie|dfa|brotli|png-js|linebreak)/)',
  ],
  // pdfkit deps are ESM only; the node variant of this import uses import.meta, not available in CommonJS
  moduleNameMapper: { '^#binary-trie$': '<rootDir>/node_modules/unicode-properties/binaryTrie.browser.js' },
}

export default config
