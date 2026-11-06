/**
 * React entry: a hook and a component on top of the browser renderer.
 * React is an optional peer dependency (>=16.8 for hooks).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { renderToCanvas, type BrowserImageSource, type BrowserRenderInput } from './browser';

export * from './browser';

/** State returned by `useNapas247QR`. */
export interface Napas247QRState {
    /** PNG data URL of the rendered card, or null while rendering / on error. */
    dataUrl: string | null;
    /** Exact EMVCo payload encoded in the QR. */
    payload: string | null;
    error: Error | null;
    loading: boolean;
}

/**
 * Builds a stable dependency key from the render input so effects re-run only when the
 * visible output would change. Image objects are reduced to their `src` (or a type tag).
 */
function inputKey(input: BrowserRenderInput): string {
    return JSON.stringify(input, (_key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
            return (value as { src?: string }).src ?? `[${(value as object).constructor?.name ?? 'object'}]`;
        }
        return value;
    });
}

/** Renders the card in an effect and exposes it as a data URL plus loading/error state. */
export function useNapas247QR(input: BrowserRenderInput): Napas247QRState {
    const [state, setState] = useState<Napas247QRState>({ dataUrl: null, payload: null, error: null, loading: true });
    const key = inputKey(input);
    const inputRef = useRef(input);
    inputRef.current = input;

    useEffect(() => {
        // Ignore results of a render that finished after the input changed or the component unmounted.
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));
        renderToCanvas<HTMLCanvasElement>(inputRef.current)
            .then(({ canvas, payload }) => {
                if (!cancelled) setState({ dataUrl: canvas.toDataURL('image/png'), payload, error: null, loading: false });
            })
            .catch((error: Error) => {
                if (!cancelled) setState({ dataUrl: null, payload: null, error, loading: false });
            });
        return () => {
            cancelled = true;
        };
    }, [key]);

    return state;
}

/** Props of the <Napas247QR> component: render input + presentation options. */
export type Napas247QRProps = BrowserRenderInput & {
    /** "img" (default) renders an <img> users can long-press/save; "canvas" draws into a <canvas>. */
    as?: 'img' | 'canvas';
    alt?: string;
    className?: string;
    style?: CSSProperties;
    /** Shown while rendering (img mode) */
    fallback?: ReactNode;
    onRender?: (payload: string) => void;
    onError?: (error: Error) => void;
};

/**
 * Drop-in replacement for `<img src="https://img.vietqr.io/...">`.
 * Example: <Napas247QR bank="VCB" accountNo="0123456789" accountName="NGUYEN VAN A" addInfo="user01" template="print" />
 */
export function Napas247QR(props: Napas247QRProps) {
    const { as = 'img', alt = 'QR chuyển khoản', className, style, fallback = null, onRender, onError, ...input } = props;
    if (as === 'canvas') {
        return <CanvasQR input={input} className={className} style={style} onRender={onRender} onError={onError} />;
    }
    return <ImgQR input={input} alt={alt} className={className} style={style} fallback={fallback} onRender={onRender} onError={onError} />;
}

interface InnerProps {
    input: BrowserRenderInput;
    className?: string;
    style?: CSSProperties;
    onRender?: (payload: string) => void;
    onError?: (error: Error) => void;
}

/** <img> variant: renders off-screen, then shows the PNG data URL. */
function ImgQR({ input, alt, fallback, className, style, onRender, onError }: InnerProps & { alt: string; fallback: ReactNode }) {
    const { dataUrl, payload, error } = useNapas247QR(input);

    // Forward lifecycle callbacks once per finished render.
    useEffect(() => {
        if (payload) onRender?.(payload);
    }, [payload]);
    useEffect(() => {
        if (error) onError?.(error);
    }, [error]);

    if (!dataUrl) return <>{fallback}</>;
    return <img src={dataUrl} alt={alt} className={className} style={style} />;
}

/** <canvas> variant: draws straight into the mounted canvas element. */
function CanvasQR({ input, className, style, onRender, onError }: InnerProps) {
    const ref = useRef<HTMLCanvasElement>(null);
    const key = inputKey(input);
    const inputRef = useRef(input);
    inputRef.current = input;

    useEffect(() => {
        if (!ref.current) return;
        renderToCanvas(inputRef.current, ref.current)
            .then(({ payload }) => onRender?.(payload))
            .catch((err: Error) => onError?.(err));
    }, [key]);

    return <canvas ref={ref} className={className} style={style} />;
}

export type { BrowserImageSource };
