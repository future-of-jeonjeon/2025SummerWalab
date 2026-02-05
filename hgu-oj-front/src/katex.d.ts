declare module 'katex/dist/contrib/auto-render.mjs' {
    import { HTMLElement } from 'react';
    export interface RenderMathInElementOptions {
        delimiters?: {
            left: string;
            right: string;
            display: boolean;
        }[];
        ignoredTags?: string[];
        ignoredClasses?: string[];
        errorCallback?: (msg: string, err: Error) => void;
        throwOnError?: boolean;
    }
    export default function renderMathInElement(
        element: HTMLElement,
        options?: RenderMathInElementOptions
    ): void;
}
