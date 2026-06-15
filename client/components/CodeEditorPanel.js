'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Spinner } from '@/components/ui/spinner';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Spinner /> Loading editor...
    </div>
  ),
});

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'go', 'cpp'];

export function CodeEditorPanel({ language, onLanguageChange, code, onCodeChange }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Solution</span>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>
      <Editor
        height="320px"
        language={language}
        value={code}
        onChange={(value) => onCodeChange(value ?? '')}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
      />
    </div>
  );
}
