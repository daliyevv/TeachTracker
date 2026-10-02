/**
 * Kodni ranglab ko'rsatish.
 *
 * Nega alohida fayl va nega `PrismLight`:
 * `react-syntax-highlighter` ning asosiy `Prism` eksporti Prism'ning BARCHA
 * tillarini (300 dan ortiq) o'ziga tortadi — bu bitta o'zi bundle'ga ~1MB
 * qo'shadi. Ilova esa faqat o'n ikki tilni ishlatadi: `DictationWorker` dagi
 * `languageMap` da nechta bo'lsa, shuncha.
 *
 * `PrismLight` esa bo'sh keladi va faqat ro'yxatdan o'tgan tillarni oladi.
 */
import React from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';

// `DictationWorker` dagi `languageMap` bilan mos bo'lishi kerak.
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('markup', markup);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('markdown', markdown);

/** Ro'yxatdan o'tmagan til kelsa, ranglashsiz ko'rsatiladi. */
const SUPPORTED = new Set([
  'javascript', 'typescript', 'python', 'html', 'markup', 'css', 'java',
  'cpp', 'c', 'php', 'ruby', 'go', 'rust', 'json', 'markdown',
]);

interface Props {
  language?: string;
  children: string;
  showLineNumbers?: boolean;
  customStyle?: React.CSSProperties;
}

export const CodeBlock: React.FC<Props> = ({ language, children, showLineNumbers, customStyle }) => {
  const lang = language && SUPPORTED.has(language) ? language : 'text';
  return (
    <SyntaxHighlighter
      language={lang}
      style={vscDarkPlus}
      customStyle={customStyle ?? { margin: 0, borderRadius: '1rem', fontSize: '0.8rem' }}
      showLineNumbers={showLineNumbers}
    >
      {children}
    </SyntaxHighlighter>
  );
};

export default CodeBlock;
