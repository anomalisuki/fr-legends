// Provide a fallback JSX namespace when some dependency typings reference it.
// This keeps external .ts/.d.ts files from failing during the Next build.
import * as React from "react";

declare global {
  namespace JSX {
    // Accept any intrinsic element to satisfy libs referencing JSX.IntrinsicElements
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
