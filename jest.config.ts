import type { Config } from 'jest'

const config: Config = {
  roots: ['<rootDir>/dist/'],
  testEnvironment: 'node',
  verbose: true,
  // Several dependencies of @openforis/arena-core are ESM-only (type: "module").
  // Transform them to CJS so Jest's CommonJS environment can require() them.
  transform: {
    '\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          module: 'CommonJS',
          moduleResolution: 'Node',
        },
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@jsep-plugin/regex|@turf/destination|@turf/helpers|@turf/invariant|change-case|jsep|uuid)(/|$))',
  ],
}

export default config
