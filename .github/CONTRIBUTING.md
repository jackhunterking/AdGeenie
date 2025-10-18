# Contributing Guidelines

## Code Quality Standards

This project maintains high code quality standards to ensure maintainability and reliability. All code must pass TypeScript compilation and ESLint checks before deployment.

## TypeScript Best Practices

### No `any` Types
- **Rule**: Never use `any` type. Always provide proper type definitions.
- **Why**: Type safety prevents runtime errors and improves code maintainability.
- **Instead**: Create proper interfaces or use `unknown` with type guards.

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
interface DataShape {
  value: string;
}

function processData(data: DataShape) {
  return data.value;
}
```

### Unused Variables
- **Rule**: Mark intentionally unused parameters with underscore prefix (`_param`).
- **Why**: Distinguishes between accidental and intentional unused variables.

```typescript
// ❌ Bad
const handleClick = (event, data) => {
  console.log(data);
};

// ✅ Good
const handleClick = (_event, data) => {
  console.log(data);
};
```

## React Best Practices

### React Hooks Dependencies
- **Rule**: Include all dependencies in `useEffect`, `useMemo`, and `useCallback` hooks.
- **Why**: Prevents stale closures and ensures consistent behavior.
- **Complex Cases**: Wrap complex dependencies in `useMemo` or `useCallback`.

```typescript
// ❌ Bad
useEffect(() => {
  doSomething(data);
}, []); // Missing 'data' dependency

// ✅ Good
useEffect(() => {
  doSomething(data);
}, [data]);

// ✅ Good (for complex objects)
const memoizedData = useMemo(() => 
  computeData(input),
  [input]
);

useEffect(() => {
  doSomething(memoizedData);
}, [memoizedData]);
```

### Entity Escaping
- **Rule**: Use HTML entities for quotes and apostrophes in JSX.
- **Why**: Prevents rendering issues and maintains valid HTML.

```typescript
// ❌ Bad
<p>Don't use raw quotes "like this"</p>

// ✅ Good
<p>Don&apos;t use HTML entities &quot;like this&quot;</p>
```

## Image Handling

### When to Use `<img>` vs `<Image />`

**Use regular `<img>` tag for:**
- AI-generated images (dynamic URLs)
- User-uploaded content
- External image URLs (social media, APIs)
- Base64-encoded images
- Dynamic image sources that change frequently

**Use Next.js `<Image />` for:**
- Static assets in `/public` directory
- Known dimensions at build time
- Images that benefit from automatic optimization

```typescript
// ✅ Good - AI-generated or dynamic content
<img src={aiGeneratedUrl} alt="Generated ad" />

// ✅ Good - Static assets
import Image from 'next/image';
<Image src="/logo.png" width={100} height={100} alt="Logo" />
```

## Pre-Commit Checklist

Before committing code, ensure:

1. ✅ Code compiles without TypeScript errors
2. ✅ All ESLint rules pass
3. ✅ No `any` types used
4. ✅ All React Hook dependencies declared
5. ✅ Unused variables prefixed with underscore
6. ✅ HTML entities used for quotes in JSX
7. ✅ No console.log statements (use proper logging)

## Running Linters Locally

### Check for issues:
```bash
npm run lint
```

### Auto-fix some issues:
```bash
npm run lint -- --fix
```

### Type checking:
```bash
npx tsc --noEmit
```

## Build Process

### Local build test:
```bash
npm run build
```

The build must complete with:
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ⚠️ ESLint warnings are acceptable but should be minimized

## ESLint Configuration

Our ESLint setup enforces:
- **Errors**: TypeScript issues, `any` types, unused variables, unescaped entities
- **Warnings**: React Hooks dependency arrays (for complex cases)
- **Disabled**: `no-img-element` (we use dynamic images)

## Common Issues and Solutions

### Issue: "Unexpected any" error
**Solution**: Define proper interfaces or use `unknown` with type guards.

### Issue: "React Hook has missing dependencies"
**Solution**: Add dependencies or wrap complex objects in `useMemo`.

### Issue: "node is defined but never used"
**Solution**: Remove the parameter or prefix with underscore (`_node`).

### Issue: "Using <img> could result in slower LCP"
**Solution**: This warning is disabled project-wide. Use `<img>` for dynamic content.

## Questions?

If you're unsure about any guideline, check existing code for patterns or ask the team.

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Hooks Rules](https://react.dev/reference/react/hooks#rules-of-hooks)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

