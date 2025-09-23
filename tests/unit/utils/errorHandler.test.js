/**
 * ErrorHandler のテスト
 */

const TestSetup = require('../../helpers/utils/testSetup');

// loggerをモック
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('ErrorHandler', () => {
  let testSetup;
  let errorHandler;
  let originalConsole;

  beforeEach(async () => {
    testSetup = new TestSetup();
    await testSetup.createTestDirectory('error-handler-test');
    testSetup.changeToTestDirectory();

    // コンソール出力をキャプチャ
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // ErrorHandlerをインポート（毎回新しいインスタンス）
    jest.resetModules();
    errorHandler = require('../../../src/utils/errorHandler');
  });

  afterEach(async () => {
    // コンソールを復元
    Object.assign(console, originalConsole);

    // エラーカウントをリセット
    errorHandler.resetErrorCount();

    await testSetup.cleanup();
    jest.clearAllMocks();
  });

  describe('エラー分類', () => {
    test('Critical Errorを正しく分類する', () => {
      const criticalError = new Error('Permission denied');
      const result = errorHandler.classifyAndHandle(criticalError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL ERROR:'),
        expect.any(String)
      );
    });

    test('Recoverable Errorを正しく分類する', () => {
      const recoverableError = new Error('Network timeout occurred');
      const result = errorHandler.classifyAndHandle(recoverableError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  RECOVERABLE ERROR:'),
        expect.any(String)
      );
    });

    test('Warning Errorを正しく分類する', () => {
      const warningError = new Error('Optional feature unavailable');
      const result = errorHandler.classifyAndHandle(warningError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  WARNING:'),
        expect.any(String)
      );
    });

    test('Unknown Errorを正しく処理する', () => {
      const unknownError = new Error('Some unknown error');
      const result = errorHandler.classifyAndHandle(unknownError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❓ UNKNOWN ERROR:'),
        expect.any(String)
      );
    });
  });

  describe('Critical Error処理', () => {
    test('権限拒否エラーの処理', () => {
      const permissionError = new Error('EACCES: permission denied');
      permissionError.code = 'EACCES';

      const result = errorHandler.classifyAndHandle(permissionError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toContain('ファイルアクセス権限');
    });

    test('ディスク容量不足エラーの処理', () => {
      const diskError = new Error('ENOSPC: no space left on device');
      diskError.code = 'ENOSPC';

      const result = errorHandler.classifyAndHandle(diskError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toContain('ディスク容量');
    });

    test('認証失敗エラーの処理', () => {
      const authError = new Error('Authentication failed');

      const result = errorHandler.classifyAndHandle(authError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(false);
      expect(result.suggestion).toContain('GitHub認証');
    });
  });

  describe('Recoverable Error処理', () => {
    test('ネットワークタイムアウトエラーの処理', () => {
      const timeoutError = new Error('Request timeout');

      const result = errorHandler.classifyAndHandle(timeoutError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('再試行');
    });

    test('マージコンフリクトエラーの処理', () => {
      const conflictError = new Error('Merge conflict detected');

      const result = errorHandler.classifyAndHandle(conflictError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('対話的に解決');
    });

    test('API制限エラーの処理', () => {
      const rateLimitError = new Error('Rate limit exceeded');

      const result = errorHandler.classifyAndHandle(rateLimitError);

      expect(result.handled).toBe(true);
      expect(result.recoverable).toBe(true);
      expect(result.suggestion).toContain('待機');
    });
  });

  describe('エラー判定ロジック', () => {
    test('isCriticalErrorが正しく動作する', () => {
      expect(errorHandler.isCriticalError(
        { message: 'permission denied' },
        'permission denied',
        null
      )).toBe(true);

      expect(errorHandler.isCriticalError(
        { code: 'EACCES' },
        '',
        'EACCES'
      )).toBe(true);

      expect(errorHandler.isCriticalError(
        { message: 'normal error' },
        'normal error',
        null
      )).toBe(false);
    });

    test('isRecoverableErrorが正しく動作する', () => {
      expect(errorHandler.isRecoverableError(
        { message: 'timeout' },
        'timeout',
        null
      )).toBe(true);

      expect(errorHandler.isRecoverableError(
        { code: 'ETIMEDOUT' },
        '',
        'ETIMEDOUT'
      )).toBe(true);

      expect(errorHandler.isRecoverableError(
        { message: 'normal error' },
        'normal error',
        null
      )).toBe(false);
    });

    test('isWarningErrorが正しく動作する', () => {
      expect(errorHandler.isWarningError(
        { message: 'optional feature' },
        'optional feature',
        null
      )).toBe(true);

      expect(errorHandler.isWarningError(
        { message: 'deprecated' },
        'deprecated',
        null
      )).toBe(true);

      expect(errorHandler.isWarningError(
        { message: 'critical error' },
        'critical error',
        null
      )).toBe(false);
    });
  });

  describe('エラータイプ判定', () => {
    test('getCriticalErrorTypeが正しく動作する', () => {
      expect(errorHandler.getCriticalErrorType(
        {},
        'repository corrupt',
        null
      )).toBe('GIT_REPOSITORY_CORRUPTION');

      expect(errorHandler.getCriticalErrorType(
        {},
        'permission denied',
        null
      )).toBe('PERMISSION_DENIED');

      expect(errorHandler.getCriticalErrorType(
        {},
        '',
        'ENOSPC'
      )).toBe('DISK_SPACE_FULL');
    });

    test('getRecoverableErrorTypeが正しく動作する', () => {
      expect(errorHandler.getRecoverableErrorType(
        {},
        'timeout',
        null
      )).toBe('NETWORK_TIMEOUT');

      expect(errorHandler.getRecoverableErrorType(
        {},
        '',
        'ECONNREFUSED'
      )).toBe('CONNECTION_REFUSED');

      expect(errorHandler.getRecoverableErrorType(
        {},
        'merge conflict',
        null
      )).toBe('MERGE_CONFLICT');
    });
  });

  describe('復旧提案', () => {
    test('Critical Error復旧提案が適切', () => {
      const suggestion = errorHandler.suggestCriticalRecovery('PERMISSION_DENIED', {});

      expect(suggestion.canRecover).toBe(false);
      expect(suggestion.suggestion).toContain('ファイルアクセス権限');
      expect(suggestion.suggestion).toContain('chmod');
    });

    test('Recoverable Error復旧提案が適切', () => {
      const suggestion = errorHandler.suggestRecoverableRecovery('NETWORK_TIMEOUT', {});

      expect(suggestion.suggestion).toContain('ネットワークタイムアウト');
      expect(suggestion.suggestion).toContain('再試行');
    });

    test('不明なエラータイプの復旧提案', () => {
      const criticalSuggestion = errorHandler.suggestCriticalRecovery('UNKNOWN_TYPE', {});
      expect(criticalSuggestion.suggestion).toContain('原因不明');

      const recoverableSuggestion = errorHandler.suggestRecoverableRecovery('UNKNOWN_TYPE', {});
      expect(recoverableSuggestion.suggestion).toContain('自動復旧');
    });
  });

  describe('エラー統計', () => {
    test('エラー統計が正しく記録される', () => {
      // 複数のエラーを発生させる
      errorHandler.classifyAndHandle(new Error('permission denied'));
      errorHandler.classifyAndHandle(new Error('timeout'));
      errorHandler.classifyAndHandle(new Error('optional feature'));

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.criticalErrors.length).toBeGreaterThanOrEqual(1);
      expect(stats.timestamp).toBeDefined();
    });

    test('エラーカウントのリセット', () => {
      errorHandler.classifyAndHandle(new Error('test error'));
      expect(errorHandler.getErrorStats().totalErrors).toBe(1);

      errorHandler.resetErrorCount();
      expect(errorHandler.getErrorStats().totalErrors).toBe(0);
      expect(errorHandler.getErrorStats().criticalErrors.length).toBe(0);
    });
  });

  describe('エラーメッセージフォーマット', () => {
    test('エラーメッセージが正しくフォーマットされる', () => {
      const error = new Error('Test error message');
      const formatted = errorHandler.formatErrorMessage('ERROR', 'TEST_TYPE', error);

      expect(formatted).toBe('[ERROR] TEST_TYPE: Test error message');
    });

    test('エラーオブジェクトでないものも処理される', () => {
      const formatted = errorHandler.formatErrorMessage('WARN', 'TEST', 'Simple string error');

      expect(formatted).toBe('[WARN] TEST: Simple string error');
    });
  });

  describe('コンテキスト情報', () => {
    test('コンテキスト情報が適切に処理される', () => {
      const context = {
        operation: 'test-operation',
        userId: 'test-user',
        step: 'validation'
      };

      const error = new Error('Test error with context');
      const result = errorHandler.classifyAndHandle(error, context);

      expect(result.handled).toBe(true);
      // loggerがコンテキスト情報付きで呼ばれることを確認
      const logger = require('../../../src/utils/logger');
      expect(logger.error || logger.warn || logger.info).toHaveBeenCalled();
    });
  });
});