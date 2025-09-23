module.exports = {
  testEnvironment: 'node',

  // テストファイルの場所
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // カバレッジ収集対象
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js' // エントリーポイントは除外
  ],

  // カバレッジ設定
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 15,
      statements: 15
    },
    // 重要なモジュールには高い閾値を設定（現在のカバレッジに基づく）
    'src/utils/errorHandler.js': {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75
    },
    'src/services/github.js': {
      branches: 50,
      functions: 80,
      lines: 70,
      statements: 70
    }
  },

  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/utils/jestSetup.js'],

  // モック設定
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // タイムアウト設定
  testTimeout: 10000,

  // 詳細出力
  verbose: true,

  // 並列実行の制御（作業ディレクトリ競合を避けるため順次実行）
  maxWorkers: 1,

  // モジュール名マッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 監視対象外ファイル
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.team-flow/'
  ],

  // グローバル変数
  globals: {
    'process.env.NODE_ENV': 'test'
  }
}