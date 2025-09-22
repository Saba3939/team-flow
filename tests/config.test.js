const config = require('../src/config');

describe('Config', () => {
  test('設定オブジェクトが正しく初期化される', () => {
    const configData = config.getConfig();

    expect(configData).toHaveProperty('github');
    expect(configData).toHaveProperty('slack');
    expect(configData).toHaveProperty('discord');
    expect(configData).toHaveProperty('app');
  });

  test('デバッグ情報が正しく取得できる', () => {
    const debugInfo = config.getDebugInfo();

    expect(debugInfo).toHaveProperty('github');
    expect(debugInfo).toHaveProperty('slack');
    expect(debugInfo).toHaveProperty('discord');
    expect(debugInfo).toHaveProperty('app');

    // 機密情報が含まれていないことを確認
    expect(debugInfo.github).not.toHaveProperty('token');
    expect(debugInfo.slack).not.toHaveProperty('token');
    expect(debugInfo.discord).not.toHaveProperty('webhookUrl');
  });
});