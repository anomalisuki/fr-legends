import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
    font-family: 'system-ui', 'Segoe UI', 'Roboto', sans-serif;
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    color: ${theme.colors.textMuted};
    text-decoration: underline;
    transition: color 0.2s ease;

    &:hover {
      color: ${theme.colors.text};
    }
  }

  input, button, textarea, select {
    font-family: inherit;
  }

  input[type="range"] {
    width: 100%;
  }

  button {
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover:not(:disabled) {
      opacity: 0.8;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  input[type="number"],
  input[type="text"],
  input[type="email"],
  textarea {
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: ${theme.colors.primary};
    }
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.surface};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.border};
    border-radius: 4px;

    &:hover {
      background: ${theme.colors.textMuted};
    }
  }
`;
