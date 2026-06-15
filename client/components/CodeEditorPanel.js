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

const LANGUAGES = [
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'java', label: 'Java', monaco: 'java' },
];

export function CodeEditorPanel({ language, onLanguageChange, code, onCodeChange, height = '60vh' }) {
  const { resolvedTheme } = useTheme();
  const monacoLang = LANGUAGES.find((l) => l.value === language)?.monaco || 'python';

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Solution</span>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height={height}
          language={monacoLang}
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
}

export { LANGUAGES };
