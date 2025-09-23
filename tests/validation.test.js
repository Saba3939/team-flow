const Validation = require('../src/utils/validation');

// 便利な関数を作成（後方互換性のため）
const validateBranchName = (name) => Validation.validateBranchName(name);
const validateCommitMessage = (message) => Validation.validateCommitMessage(message);
const validateUrl = (url) => Validation.validateUrl(url);

describe('Validation', () => {
  describe('validateBranchName', () => {
    test('有効なブランチ名を受け入れる', () => {
      const result = validateBranchName('feature/new-function');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('feature/new-function');
    });

    test('無効なブランチ名を拒否する', () => {
      const result = validateBranchName('feature with spaces');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('空のブランチ名を拒否する', () => {
      const result = validateBranchName('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCommitMessage', () => {
    test('有効なコミットメッセージを受け入れる', () => {
      const result = validateCommitMessage('機能追加: 新しいログイン機能');
      expect(result.valid).toBe(true);
    });

    test('短すぎるコミットメッセージを拒否する', () => {
      const result = validateCommitMessage('fix');
      expect(result.valid).toBe(false);
    });

    test('空のコミットメッセージを拒否する', () => {
      const result = validateCommitMessage('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    test('有効なHTTPS URLを受け入れる', () => {
      const result = validateUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    test('無効なURLを拒否する', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });
  });
});