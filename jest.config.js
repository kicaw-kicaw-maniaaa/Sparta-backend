module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
  },
};
