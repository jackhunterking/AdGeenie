import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow img tags for dynamic/external content (AI-generated images, user uploads, social previews)
      '@next/next/no-img-element': 'off',
      
      // Keep strict TypeScript rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // React hooks - enforce but allow flexibility for complex cases
      'react-hooks/exhaustive-deps': 'warn',
      
      // Enforce proper entity escaping
      'react/no-unescaped-entities': 'error',
    }
  }
];

export default eslintConfig;
