import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkSlug from 'remark-slug';
import Link from 'next/link';

export const getStaticPaths = async () => {
  const docsDir = path.join(process.cwd(), 'documentation');
  let files: string[] = [];
  try {
    files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
  } catch (e) {
    files = [];
  }
  const paths = files.map((f) => ({ params: { slug: f.replace(/\.[^.]+$/, '') } }));
  return { paths, fallback: false };
};

export const getStaticProps = async ({ params }: { params: { slug: string } }) => {
  const { slug } = params;
  const docsDir = path.join(process.cwd(), 'documentation');
  const exts = ['.md', '.txt'];
  let foundFile: string | null = null;
  for (const ext of exts) {
    const p = path.join(docsDir, `${slug}${ext}`);
    if (fs.existsSync(p)) {
      foundFile = p;
      break;
    }
  }
  if (!foundFile) {
    return { notFound: true };
  }
  const content = fs.readFileSync(foundFile, 'utf8');
  const name = path.basename(foundFile);
  return { props: { content, name } };
};

export default function DocPage({ content, name }: { content: string; name: string }) {
  return (
    <div style={{ padding: 20 }}>
      <div className="markdown-body" style={{margin: '0 auto', padding: '24px' }}>
        <div style={{ marginBottom: 12 }}>
          <Link href="/documentation">Back</Link>
        </div>
        <h1>{name}</h1>
        <div style={{ marginTop: 12 }}>
          <ReactMarkdown remarkPlugins={[[remarkToc, { tight: true }], remarkSlug, remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
