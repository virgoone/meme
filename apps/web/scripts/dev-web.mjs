// Bun can install separate Vite instances for different peer dependency sets.
// Start must recognize the dev server's environment using its own Vite instance.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fromStart = createRequire(import.meta.resolve('@tanstack/react-start/plugin/vite'));
const fromCore = createRequire(fromStart.resolve('@tanstack/start-plugin-core/package.json'));
const viteCli = resolve(dirname(fromCore.resolve('vite/package.json')), 'bin/vite.js');
await import(pathToFileURL(viteCli).href);
