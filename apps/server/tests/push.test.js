describe('pushService module', () => {
  it('exports subscribe, unsubscribe, sendToUser', () => {
    const pushService = require('../services/pushService');
    expect(typeof pushService.subscribe).toBe('function');
    expect(typeof pushService.unsubscribe).toBe('function');
    expect(typeof pushService.sendToUser).toBe('function');
  });
});

describe('PushSubscription model', () => {
  it('exports a Mongoose model', () => {
    const PushSubscription = require('../models/PushSubscription');
    expect(PushSubscription.modelName).toBe('PushSubscription');
    expect(PushSubscription.schema.path('endpoint')).toBeDefined();
    expect(PushSubscription.schema.path('userId')).toBeDefined();
    expect(PushSubscription.schema.path('keys.p256dh')).toBeDefined();
    expect(PushSubscription.schema.path('keys.auth')).toBeDefined();
  });
});
