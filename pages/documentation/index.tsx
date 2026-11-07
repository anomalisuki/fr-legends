import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import React from 'react';

export const getStaticProps = async () => {
  const docsDir = path.join(process.cwd(), 'documentation');
  let files: string[] = [];
  try {
    files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
  } catch (e) {
    files = [];
  }
  const docs = files.map((f) => ({ slug: f.replace(/\.[^.]+$/, ''), name: f }));
  return { props: { docs } };
};

export default function DocumentationIndex({ docs }: { docs: Array<{ slug: string; name: string }> }) {
  return (
    <div style={{ padding: 20 }}>
      <div className="markdown-body" style={{margin: '0 auto', padding: '24px' }}>
       <div style={{ marginBottom: 12 }}>
         <Link href="/">Back</Link>
       </div>
        <h1>Documentation</h1>
        {docs.length === 0 ? (
          <div>No documentation files found in the documentation/ folder.</div>
        ) : (
          <ul>
            {docs.map((d) => (
              <li key={d.slug}>
                <Link href={`/documentation/${d.slug}`}>
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
