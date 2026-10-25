import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  window.scrollTo = vi.fn();
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  vi.clearAllTimers();
});

afterAll(() => {
  server.close();
});
