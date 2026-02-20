## Repo snapshot

- Framework: Expo (managed), Router: `expo-router` (file-based routing).
- Language: TypeScript. Path alias `@/*` -> `./*` (see `tsconfig.json`).
- Entry: `expo-router/entry` (see `package.json` `main`).

## What an agent should know to be productive

- Routing and layouts: the `app/` folder uses file-based routing. Root layout is at `app/_layout.tsx` and the tab layout lives at `app/(tabs)/_layout.tsx`.
  - Modal route example: `app/modal.tsx` is registered as a modal in `app/_layout.tsx`.
- The project uses `ThemeProvider` (from `@react-navigation/native`) + a local `use-color-scheme` hook to select themes. See `constants/theme.ts` and `hooks/use-color-scheme.web.ts` for web hydration behavior.
- UI conventions:
  - Small, focused components live in `components/` and `components/ui/`.
  - Use the `IconSymbol` mapper (`components/ui/icon-symbol.tsx`) to add new SF-symbol -> MaterialIcon mappings for cross-platform icons.
  - Use `ExternalLink` (`components/external-link.tsx`) when linking to external sites so native apps open links in the in-app browser (uses `expo-web-browser`).
  - Custom tab button `HapticTab` (`components/haptic-tab.tsx`) shows the haptics pattern and checks `process.env.EXPO_OS` for platform-specific behavior.

## Common developer workflows (explicit)

- Install deps: `npm install`.
- Start dev server: `npm start` or `npx expo start` (same as `npm run start`).
- Platform shortcuts: `npm run android`, `npm run ios`, `npm run web`.
- Lint: `npm run lint` (runs `expo lint`).
- Reset starter project: `npm run reset-project` — this will move starter code to `app-example` and create a blank `app/` directory. Be careful when running it.

## Project-specific patterns & examples

- Import aliases: use `@/path/to/file` (root-based) rather than relative paths. Example: `import { HapticTab } from '@/components/haptic-tab'`.
- File-based route grouping: the folder name `(tabs)` is used as an anchor in `unstable_settings` inside `app/_layout.tsx` to mount tab navigation.
- Theme/colors: read/write color tokens in `constants/theme.ts` and reference `Colors[colorScheme].tint` for tab tint colors.
- External linking: prefer `ExternalLink` over raw `Link` to get native in-app browser behavior. Example usage:

  <Link href="https://example.com" target="_blank" />

  But in this project use `ExternalLink` which wraps `Link` and calls `openBrowserAsync` on native.

## Small implementation rules for edits

- Keep TypeScript `strict` mode in mind (enabled in `tsconfig.json`).
- Add icon names to `MAPPING` in `components/ui/icon-symbol.tsx` when introducing new SF symbol names.
- When adding navigation/screens, prefer file-based routes under `app/`. To add a new tab, add the screen file under `app/(tabs)/` and add a `Tabs.Screen` entry in `app/(tabs)/_layout.tsx`.
- For platform-specific behavior, check `process.env.EXPO_OS` (the codebase uses this pattern already).

## Files to inspect for context

- `app/_layout.tsx`, `app/(tabs)/_layout.tsx` — routing and navigation
- `components/external-link.tsx`, `components/haptic-tab.tsx`, `components/ui/icon-symbol.tsx` — UI/UX helpers
- `constants/theme.ts` — colors & fonts
- `hooks/use-color-scheme.web.ts` — web hydration nuance
- `package.json`, `tsconfig.json` — scripts and path aliases

If anything here is ambiguous or you'd like me to expand examples (e.g., add a small PR that adds an icon mapping or a new route), tell me which area to focus on and I'll update this file.
