#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const contentDir = process.argv[2] || 'content';

function splitByCodeBlocks(content: string): { text: string; isCode: boolean }[] {
  const parts: { text: string; isCode: boolean }[] = [];
  const codeBlockRegex = /^(```|~~~)/gm;
  
  let lastIndex = 0;
  let inCodeBlock = false;
  let match;
  
  codeBlockRegex.lastIndex = 0;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const segment = content.slice(lastIndex, match.index);
    if (segment) {
      parts.push({ text: segment, isCode: inCodeBlock });
    }
    inCodeBlock = !inCodeBlock;
    lastIndex = match.index;
  }
  
  // Add remaining content
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isCode: inCodeBlock });
  }
  
  return parts;
}

function transformCallouts(content: string): string {
  return content.replace(
    /^> \[!(INFO|WARNING|WARN|DANGER|ERROR|TIP|HINT|NOTE)\]\n((?:> .*\n?)*)/gm,
    (match, type, body) => {
      const cleanBody = body.replace(/^> /gm, '').trim();
      const normalizedType = type.toLowerCase() === 'warn' ? 'warning' : 
                             type.toLowerCase() === 'error' ? 'danger' :
                             type.toLowerCase() === 'hint' ? 'tip' :
                             type.toLowerCase();
      return `{% callout(type="${normalizedType}") %}\n${cleanBody}\n{% end %}\n`;
    }
  );
}

function transformImages(content: string): string {
  return content.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g,
    (match, alt, url, attrs) => {
      const params: string[] = [`id="${url}"`];
      
      if (alt) {
        params.push(`alt="${alt}"`);
      }
      
      const classes = attrs.match(/\.([a-zA-Z0-9_-]+)/g)?.map(c => c.slice(1)) || [];
      if (classes.length) {
        params.push(`class="${classes.join(' ')}"`);
      }
      
      const keyValueMatches = attrs.matchAll(/([a-zA-Z]+)=["']?([^"'\s}]+)["']?/g);
      for (const [, key, value] of keyValueMatches) {
        if (key !== 'class') {
          params.push(`${key}="${value.replace(/["']/g, '')}"`);
        }
      }
      
      return `{{ img(${params.join(', ')}) }}`;
    }
  );
}

function processFile(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Split by code blocks and only transform non-code parts
  const parts = splitByCodeBlocks(content);
  content = parts.map(part => {
    if (part.isCode) {
      return part.text; // Don't transform code blocks
    }
    let text = part.text;
    text = transformCallouts(text);
    text = transformImages(text);
    return text;
  }).join('');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
}

const files = glob.sync(`${contentDir}/**/*.md`);
files.forEach(processFile);

