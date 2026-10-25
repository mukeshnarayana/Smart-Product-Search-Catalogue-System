import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SearchBar from '../components/SearchBar';

describe('SearchBar Debounce Behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('typing "wireless" quickly fires ONE search callback after 300ms, not eight', () => {
    const onSearchMock = vi.fn();
    render(<SearchBar value="" onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText(/search by name/i);

    // Simulate typing "w", "wi", "wir", "wire", "wirel", "wirele", "wireles", "wireless" quickly
    const text = 'wireless';
    for (let i = 1; i <= text.length; i++) {
      fireEvent.change(input, { target: { value: text.slice(0, i) } });
      // Advance by only 30ms (less than 300ms debounce interval)
      vi.advanceTimersByTime(30);
    }

    // Before debounce duration expires, callback must NOT have fired
    expect(onSearchMock).not.toHaveBeenCalled();

    // Advance remaining time to complete the 300ms window
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Must be called exactly once with final trimmed text
    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith('wireless');
  });

  it('pressing Enter fires the search immediately and skips debounce timer', () => {
    const onSearchMock = vi.fn();
    render(<SearchBar value="" onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText(/search by name/i);

    fireEvent.change(input, { target: { value: 'mouse' } });
    expect(onSearchMock).not.toHaveBeenCalled();

    // Press Enter immediately
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSearchMock).toHaveBeenCalledTimes(1);
    expect(onSearchMock).toHaveBeenCalledWith('mouse');
  });

  it('pressing Escape clears the input and triggers search with empty string', () => {
    const onSearchMock = vi.fn();
    render(<SearchBar value="gaming" onSearch={onSearchMock} />);

    const input = screen.getByPlaceholderText(/search by name/i);
    expect(input.value).toBe('gaming');

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(input.value).toBe('');
    expect(onSearchMock).toHaveBeenCalledWith('');
  });
});
