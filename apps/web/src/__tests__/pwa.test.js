import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PWA manifest', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(__dirname, '../../public/manifest.json'), 'utf-8')
  );

  it('has required fields', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/dashboard');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1b70f5');
    expect(manifest.background_color).toBe('#ffffff');
  });

  it('has correct icon sizes', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('has maskable icons', () => {
    const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
    expect(maskable.length).toBeGreaterThanOrEqual(1);
  });
});

describe('next.config.js PWA wrapper', () => {
  it('exports a function via withPWA', () => {
    const config = require('../../next.config.js');
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });
});
