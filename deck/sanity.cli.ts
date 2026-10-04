import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: 'o4h8r4fp1',
    entry: './src/App.tsx',
    title: 'Cue Deck',
  },
  deployment: {appId: 'hfqfe4stqbkn23mv9qs3bryp'},
  // The Deck reuses the engine and the roll component from ../floor (no workspace, no copy).
  // React and motion must resolve to one copy, so dedupe them.
  vite: (config) => ({
    ...config,
    resolve: {...config.resolve, dedupe: ['react', 'react-dom', 'motion']},
    server: {...config.server, fs: {...config.server?.fs, allow: ['..']}},
  }),
})
