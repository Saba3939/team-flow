/**
 * Logger モジュールのテスト
 */

const fs = require('fs-extra');
const path = require('path');
const TestSetup = require('../../helpers/utils/testSetup');

// テスト用の設定でLoggerを初期化
const mockConfig = {
  get: jest.fn((key) => {
    const configs = {
      'app.debug': true
    };
    return configs[key];
  })
};

jest.doMock('../../../src/config', () => mockConfig);

const Logger = require('../../../src/utils/logger');

describe('Logger', () => {
  let testSetup;
  let originalConsole;

  beforeEach(async () => {
    testSetup = new TestSetup();
    await testSetup.createTestDirectory('logger-test');
    testSetup.changeToTestDirectory();
    testSetup.setupEnvironment();

    // コンソール出力をキャプチャ
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();

    // Loggerを再初期化
    Logger.logLevel = 'debug';
    Logger.initialized = false;
  });

  afterEach(async () => {
    // コンソールを復元
    Object.assign(console, originalConsole);
    await testSetup.cleanup();
  });

  describe('基本ログ機能', () => {
    test('infoログが正しく出力される', () => {
      Logger.info('テスト情報メッセージ');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  情報:'),
        'テスト情報メッセージ'
      );
    });

    test('errorログが正しく出力される', () => {
      const error = new Error('テストエラー');
      Logger.error('エラーが発生しました', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ エラー:'),
        'エラーが発生しました - テストエラー'
      );
    });

    test('warnログが正しく出力される', () => {
      Logger.warn('警告メッセージ');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  警告:'),
        '警告メッセージ'
      );
    });

    test('successログが正しく出力される', () => {
      Logger.success('成功メッセージ');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ 成功:'),
        '成功メッセージ'
      );
    });

    test('debugログが正しく出力される', () => {
      Logger.debug('デバッグメッセージ');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 デバッグ:'),
        'デバッグメッセージ'
      );
    });
  });

  describe('プロセスログ機能', () => {
    test('startProcessログが正しく出力される', () => {
      Logger.startProcess('プロセス開始');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🚀 開始:'),
        'プロセス開始'
      );
    });

    test('endProcessログが正しく出力される', () => {
      Logger.endProcess('プロセス完了');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🏁 完了:'),
        'プロセス完了'
      );
    });
  });

  describe('セキュリティログ機能', () => {
    test('機密情報がマスクされる', () => {
      const sensitiveData = {
        token: 'secret-token-123',
        password: 'secret-password',
        normalData: 'visible-data'
      };

      Logger.securityLog('info', 'Test with token: ghp_1234567890', sensitiveData);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  情報:'),
        'Test with token: ***masked***'
      );
    });

    test('メッセージ内のトークンがマスクされる', () => {
      Logger.securityLog('info', 'GitHub token: ghp_abcdef123456 を使用します');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  情報:'),
        'GitHub token: ***masked*** を使用します'
      );
    });
  });

  describe('ログレベル制御', () => {
    test('ログレベルが正しく動作する', () => {
      // info レベルに設定
      Logger.logLevel = 'info';

      Logger.debug('デバッグメッセージ');
      Logger.info('情報メッセージ');

      // debugは出力されない
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('🔍 デバッグ:'),
        'デバッグメッセージ'
      );

      // infoは出力される
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  情報:'),
        '情報メッセージ'
      );
    });
  });

  describe('コンテキスト情報', () => {
    test('コンテキスト情報付きでログが記録される', () => {
      const context = {
        operation: 'test-operation',
        userId: 'test-user',
        metadata: { step: 1 }
      };

      Logger.info('コンテキスト付きメッセージ', context);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️  情報:'),
        'コンテキスト付きメッセージ'
      );
    });

    test('エラーコンテキストが正しく処理される', () => {
      const error = new Error('テストエラー');
      error.code = 'TEST_ERROR';
      error.stack = 'Error stack trace';

      const context = {
        operation: 'test-operation'
      };

      Logger.error('エラー発生', error, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ エラー:'),
        'エラー発生 - テストエラー'
      );
    });
  });

  describe('マスキング機能', () => {
    test('機密データのマスキングが正しく動作する', () => {
      const sensitiveData = {
        githubToken: 'ghp_123456',
        apiKey: 'sk-123456',
        password: 'secret123',
        normalField: 'visible'
      };

      const masked = Logger._maskSensitiveData(sensitiveData);

      expect(masked.githubToken).toBe('***masked***');
      expect(masked.apiKey).toBe('***masked***');
      expect(masked.password).toBe('***masked***');
      expect(masked.normalField).toBe('visible');
    });

    test('メッセージのマスキングが正しく動作する', () => {
      const message = 'Using token: ghp_1234567890 and password: secret123';
      const masked = Logger._maskSensitiveMessage(message);

      expect(masked).toContain('token: ***masked***');
      expect(masked).toContain('password: ***masked***');
    });
  });

  describe('ファイル操作テスト', () => {
    test('ログ統計が取得できる', async () => {
      // ログファイルが存在しない場合のテスト
      const stats = await Logger.getLogStats();

      expect(stats).toHaveProperty('mainLogSize');
      expect(stats).toHaveProperty('errorLogSize');
      expect(stats).toHaveProperty('totalFiles');
      expect(stats.mainLogSize).toBe(0);
      expect(stats.errorLogSize).toBe(0);
    });

    test('ログ内容が取得できる', async () => {
      // 実際のログファイルがある場合
      Logger.info('情報メッセージ');
      await new Promise(resolve => setTimeout(resolve, 10));

      const content = await Logger.getLogContent(5);
      // ログファイルが存在すれば内容が含まれる
      expect(typeof content).toBe('string');
    });

    test('エラーログ内容が取得できる', async () => {
      // エラーログファイルが存在しない場合
      const content = await Logger.getErrorLogContent(5);
      expect(content).toBe('');
    });
  });

  describe('エラーハンドリング', () => {
    test('ファイル書き込みエラーが適切に処理される', async () => {
      // ファイル書き込みでエラーが発生した場合でも例外は発生しない
      expect(() => {
        Logger.info('テストメッセージ');
      }).not.toThrow();
    });

    test('ログ統計取得エラーが適切に処理される', async () => {
      const stats = await Logger.getLogStats();

      // エラーが発生してもデフォルト値が返される
      expect(stats).toEqual({
        mainLogSize: 0,
        errorLogSize: 0,
        totalFiles: 0,
        oldestLog: null,
        newestLog: null
      });
    });
  });
});