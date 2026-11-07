import React from 'react';
import type { AppProps } from 'next/app';
import 'github-markdown-css/github-markdown-light.css';
import { GlobalStyles } from '../styles/globalStyles';

function App({ Component, pageProps }: AppProps): React.ReactElement {
  return (
    <>
      <GlobalStyles />
      <Component {...pageProps} />
    </>
  );
}

export default App;
