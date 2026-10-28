import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** Required and not just whitespace. */
export const notBlank = (value: string) => value.trim() !== '';

/** For sign-in forms: something@domain.tld. */
export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Same pattern as Angular's Validators.email, which the nomination form used
const EMAIL_PATTERN =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Optional email: empty is fine. */
export const isOptionalEmail = (value: string) => value === '' || EMAIL_PATTERN.test(value);

/** Optional US phone: empty or exactly 10 digits. */
export const isOptionalPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10;
};

/** Formats US phone numbers as (555) 123-4567 while typing or pasting. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').substring(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
}

/** Runs callbacks once the next render has reached the DOM, like Angular's afterNextRender. */
export function useAfterRender(): (callback: () => void) => void {
  const queue = useRef<(() => void)[]>([]);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const callbacks = queue.current;
    queue.current = [];
    callbacks.forEach((callback) => callback());
  }, [tick]);

  return useCallback((callback: () => void) => {
    queue.current.push(callback);
    setTick((value) => value + 1);
  }, []);
}
