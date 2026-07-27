import { parse as parseYaml } from 'yaml';

export interface FrontmatterResult<T = Record<string, any>> {
  attributes: T;
  body: string;
}

export function parseFrontmatter<T = Record<string, any>>(content: string): FrontmatterResult<T> {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      attributes: {} as T,
      body: content,
    };
  }

  try {
    const rawYaml = match[1];
    const body = match[2];
    const attributes = parseYaml(rawYaml) || {};
    return {
      attributes: attributes as T,
      body: body.trim(),
    };
  } catch {
    return {
      attributes: {} as T,
      body: content,
    };
  }
}
