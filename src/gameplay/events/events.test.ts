import { describe, it, expect } from 'vitest';
import { UserLoggedInEvent, UserLoggedOutEvent } from './user';
import { NavigationCompletedEvent, UIErrorEvent, UIStateChangedEvent } from './ui';

describe('Gameplay Events', () => {
  describe('User Events', () => {
    it('should create UserLoggedInEvent with username', () => {
      const username = 'testuser';
      const event = new UserLoggedInEvent(username);
      
      expect(event.username).toBe(username);
      expect(event.loginTimestamp).toBeGreaterThan(0);
    });

    it('should create UserLoggedInEvent with custom timestamp', () => {
      const username = 'testuser';
      const timestamp = 1234567890;
      const event = new UserLoggedInEvent(username, timestamp);
      
      expect(event.username).toBe(username);
      expect(event.loginTimestamp).toBe(timestamp);
    });

    it('should create UserLoggedOutEvent with username', () => {
      const username = 'testuser';
      const event = new UserLoggedOutEvent(username);
      
      expect(event.username).toBe(username);
      expect(event.logoutTimestamp).toBeGreaterThan(0);
    });
  });

  describe('UI Events', () => {
    it('should create NavigationCompletedEvent with current view', () => {
      const event = new NavigationCompletedEvent('main-menu');
      
      expect(event.currentView).toBe('main-menu');
      expect(event.previousView).toBeNull();
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should create NavigationCompletedEvent with previous view', () => {
      const event = new NavigationCompletedEvent('game', 'main-menu');
      
      expect(event.currentView).toBe('game');
      expect(event.previousView).toBe('main-menu');
    });

    it('should create UIErrorEvent with message and type', () => {
      const message = 'Test error';
      const event = new UIErrorEvent(message, 'validation');
      
      expect(event.message).toBe(message);
      expect(event.errorType).toBe('validation');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should create UIErrorEvent with default error type', () => {
      const message = 'Test error';
      const event = new UIErrorEvent(message);
      
      expect(event.message).toBe(message);
      expect(event.errorType).toBe('unknown');
    });

    it('should create UIStateChangedEvent with change type', () => {
      const event = new UIStateChangedEvent('loading');
      
      expect(event.changeType).toBe('loading');
      expect(event.data).toBeUndefined();
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should create UIStateChangedEvent with data', () => {
      const data = { progress: 50 };
      const event = new UIStateChangedEvent('loading', data);
      
      expect(event.changeType).toBe('loading');
      expect(event.data).toEqual(data);
    });
  });
});