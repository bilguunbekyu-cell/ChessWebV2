# i18n Guide (English + Mongolian)

## Where to edit translations
- File: `src/i18n/mn.ts`
- Format:
  - Key = original English UI string
  - Value = Mongolian translation

Example:

```ts
"Play": "Тоглох",
"Quick Match": "Түргэн тааруулалт",
```

## How to check missing translations
- `npm run i18n:check`
- Shows all UI strings found in `src/pages` and `src/components` that are missing in `src/i18n/mn.ts`

## How to see every key
- All detected UI keys: `npm run i18n:list:ui`
- All currently defined Mongolian keys: `npm run i18n:list:mn`
- Missing keys with file references: `npm run i18n:check:refs`

## Recommended translation workflow
1. Run `npm run i18n:check:refs`
2. Add missing keys in `src/i18n/mn.ts`
3. Run `npm run i18n:check` again until missing is `0`
4. Run `npm run build`

## Language persistence checks
- API integration test (server must be running): `npm run test:language`
- User language migration scripts:
  - Dry run: `npm run migrate:user-languages:dry`
  - Write mode: `npm run migrate:user-languages`
