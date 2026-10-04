import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'o4h8r4fp1',
    entry: './src/App.tsx',
    title: 'Cue Deck',
  },
  // The Deck reuses the audio engine in ../floor/lib/engine (pure TypeScript, no workspace).
  vite: (config) => ({
    ...config,
    server: {...config.server, fs: {...config.server?.fs, allow: ['..']}},
  }),
})
