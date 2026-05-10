const MEANINGFUL_HTML_TAG_PATTERN = /<(?:a|img|strong|b|em|i|u|ul|ol|li|blockquote|pre|code|table|thead|tbody|tr|th|td|h[1-6]|hr)\b/i;
const RICH_HTML_ATTRIBUTE_PATTERN = /\s(?:style|class)=["']/i;
const GENERIC_HTML_PATTERN = /<\/?[a-z][^>]*>/i;

type ProblemRichTextFields = {
  description?: string;
  input_description?: string;
  output_description?: string;
  hint?: string | null;
  source?: string | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string) => escapeHtml(value).replace(/`/g, '&#96;');

const decodeHtmlEntities = (value: string) => {
  if (typeof document === 'undefined') {
    return value;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const isMeaningfulHtml = (value: string) =>
  MEANINGFUL_HTML_TAG_PATTERN.test(value) ||
  RICH_HTML_ATTRIBUTE_PATTERN.test(value);

const stripSimpleHtmlToText = (value: string) => {
  const withLineBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|section|article|header|footer|aside|h[1-6]|blockquote|pre|ul|ol)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(withLineBreaks)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatInlineMarkdown = (value: string) => {
  const codeSegments: string[] = [];
  const withCodePlaceholders = value.replace(/`([^`]+)`/g, (_, code: string) => {
    const key = `__CODE_SEGMENT_${codeSegments.length}__`;
    codeSegments.push(`<code>${escapeHtml(code)}</code>`);
    return key;
  });

  let html = escapeHtml(withCodePlaceholders);

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
  );
  html = html.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
  html = html.replace(/(^|[^\*])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/(^|[^_])_(?!\s)(.+?)(?<!\s)_(?!_)/g, '$1<em>$2</em>');

  codeSegments.forEach((segment, index) => {
    html = html.replace(`__CODE_SEGMENT_${index}__`, segment);
  });

  return html;
};

const isHeadingLine = (line: string) => /^\s*#{1,6}\s+/.test(line);
const isFenceLine = (line: string) => /^\s*```/.test(line);
const isBlockquoteLine = (line: string) => /^\s*>\s?/.test(line);
const isOrderedListLine = (line: string) => /^\s*\d+\.\s+/.test(line);
const isUnorderedListLine = (line: string) => /^\s*[-*+]\s+/.test(line);
const isBlockStartLine = (line: string) =>
  isHeadingLine(line) ||
  isFenceLine(line) ||
  isBlockquoteLine(line) ||
  isOrderedListLine(line) ||
  isUnorderedListLine(line);

const renderMarkdownList = (lines: string[], startIndex: number, listTag: 'ol' | 'ul') => {
  const html: string[] = [`<${listTag}>`];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const match =
      listTag === 'ol'
        ? line.match(/^\s*\d+\.\s+(.*)$/)
        : line.match(/^\s*[-*+]\s+(.*)$/);

    if (!match) {
      break;
    }

    const itemLines = [match[1].trim()];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) {
        break;
      }
      if (isBlockStartLine(nextLine)) {
        break;
      }
      itemLines.push(nextLine.trim());
      index += 1;
    }

    html.push(`<li>${itemLines.map(formatInlineMarkdown).join('<br />')}</li>`);

    while (index < lines.length && !lines[index].trim()) {
      index += 1;
    }
  }

  html.push(`</${listTag}>`);
  return { html: html.join(''), nextIndex: index };
};

const renderMarkdownToHtml = (value: string): string => {
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  const lines = normalized.split('\n');
  const html: string[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isFenceLine(line)) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !isFenceLine(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length && isFenceLine(lines[index])) {
        index += 1;
      }

      const languageClass = language ? ` class="language-${escapeAttribute(language)}"` : '';
      html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${formatInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (isBlockquoteLine(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && isBlockquoteLine(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      const quoteHtml = renderMarkdownToHtml(quoteLines.join('\n'));
      html.push(`<blockquote>${quoteHtml || '<p></p>'}</blockquote>`);
      continue;
    }

    if (isOrderedListLine(line)) {
      const result = renderMarkdownList(lines, index, 'ol');
      html.push(result.html);
      index = result.nextIndex;
      continue;
    }

    if (isUnorderedListLine(line)) {
      const result = renderMarkdownList(lines, index, 'ul');
      html.push(result.html);
      index = result.nextIndex;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) {
        break;
      }
      if (isBlockStartLine(nextLine)) {
        break;
      }
      paragraphLines.push(nextLine.trim());
      index += 1;
    }

    html.push(`<p>${paragraphLines.map(formatInlineMarkdown).join('<br />')}</p>`);
  }

  return html.join('\n');
};

export const normalizeRichTextForProblem = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (isMeaningfulHtml(trimmed)) {
    return trimmed;
  }

  const plainText = GENERIC_HTML_PATTERN.test(trimmed)
    ? stripSimpleHtmlToText(trimmed)
    : trimmed;

  return renderMarkdownToHtml(plainText);
};

export const normalizeProblemRichTextFields = <T extends ProblemRichTextFields>(fields: T): T => ({
  ...fields,
  description: fields.description != null ? normalizeRichTextForProblem(fields.description) : fields.description,
  input_description: fields.input_description != null ? normalizeRichTextForProblem(fields.input_description) : fields.input_description,
  output_description: fields.output_description != null ? normalizeRichTextForProblem(fields.output_description) : fields.output_description,
  hint: fields.hint != null ? normalizeRichTextForProblem(fields.hint) : fields.hint,
  source: fields.source != null ? normalizeRichTextForProblem(fields.source) : fields.source,
});
