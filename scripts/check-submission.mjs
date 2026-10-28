import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
const { default: mermaid } = await import('mermaid');

const file = process.argv[2] ?? 'submission.md';
const markdown = await readFile(file, 'utf8');
const requiredHeadings = [
  '## 主题',
  '## 结构化简介',
  '## Mermaid 流程图',
  '## 给 LLM 的提示词',
  '## LLM 回答与我的收获',
  '## 反思',
];
const errors = [];

for (const heading of requiredHeadings) {
  if (!markdown.split(/\r?\n/).some((line) => line.trim() === heading)) {
    errors.push(`缺少必需章节：${heading}`);
  }
}

const markdownWithoutDiagrams = markdown.replace(/```mermaid\s*\n[\s\S]*?```/g, '');
if (/\[(?![^\]]+\]\()[^\]]+\]/.test(markdownWithoutDiagrams)) {
  errors.push('请将所有方括号中的提示替换为自己的内容。');
}

const answerSection = markdown.split(/^## LLM 回答与我的收获\s*$/m)[1]?.split(/^## /m)[0] ?? '';
if (!/https?:\/\/|\[[^\]]+\]\(https?:\/\//.test(answerSection)) {
  errors.push('请在“LLM 回答与我的收获”中添加至少一个 Markdown 来源链接或网址。');
}

const diagrams = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
if (diagrams.length === 0) {
  errors.push('请添加至少一张 Mermaid 代码围栏图表。');
} else {
  for (const [index, diagram] of diagrams.entries()) {
    if (diagram[1].includes('请替换为你的步骤')) {
      errors.push(`第 ${index + 1} 张 Mermaid 图仍是示例，请替换为自己的流程。`);
      continue;
    }
    try {
      await mermaid.parse(diagram[1]);
    } catch (error) {
      errors.push(`第 ${index + 1} 张 Mermaid 图语法无效：${error.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`作业检查未通过（${file}）：`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`作业检查通过（${file}）。`);
}