// Simple wildcard module declaration so TS won't error on @/... imports
// We keep this very permissive; later we can add proper typed module definitions.

declare module '@/*';
