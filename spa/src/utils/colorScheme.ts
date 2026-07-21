// Colour-scheme resolution for the Gantt (dark / light).
//
// The palette in designTokens.ts is resolved once at load from resolveIsDark().
// A user's explicit choice is persisted in localStorage (per browser origin, so
// it applies across every project for that user). When left on "auto" the Gantt
// follows the surrounding Redmine theme by measuring the page background.

export type ColorSchemeSetting = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'rcg-color-scheme';

export function getColorSchemeSetting(): ColorSchemeSetting {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value === 'light' || value === 'dark' || value === 'auto') return value;
    } catch {
        // localStorage may be unavailable (private mode / sandboxed iframe).
    }
    return 'auto';
}

export function setColorSchemeSetting(value: ColorSchemeSetting): void {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // Ignore persistence failures.
    }
}

function parseRgb(value: string): { r: number; g: number; b: number; a: number } | null {
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(',').map((x) => parseFloat(x.trim()));
    if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length >= 4 ? parts[3] : 1 };
}

function relativeLuminance(r: number, g: number, b: number): number {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Detect whether the surrounding Redmine page is themed dark by measuring the
// rendered background luminance of the content area. Theme-mechanism agnostic
// (works with theme_changer). Returns null when it cannot be determined.
function detectDarkFromPage(): boolean | null {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null;
    for (const selector of ['#content', '#main', 'body']) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const rgb = parseRgb(getComputedStyle(el).backgroundColor);
        if (!rgb || rgb.a === 0) continue;
        return relativeLuminance(rgb.r, rgb.g, rgb.b) < 0.5;
    }
    return null;
}

// Resolve the effective dark/light choice, in precedence order:
//  1. Explicit user toggle (localStorage) — applies across all projects.
//  2. Host override injected by the Redmine view (window.RedmineCanvasGantt.colorScheme).
//  3. Auto: follow the surrounding Redmine theme (page background luminance).
//  4. OS/browser prefers-color-scheme.
export function resolveIsDark(): boolean {
    const setting = getColorSchemeSetting();
    if (setting === 'dark') return true;
    if (setting === 'light') return false;

    if (typeof window !== 'undefined') {
        const override = (window as unknown as { RedmineCanvasGantt?: { colorScheme?: string } })
            .RedmineCanvasGantt?.colorScheme;
        if (override === 'dark') return true;
        if (override === 'light') return false;
    }

    const fromPage = detectDarkFromPage();
    if (fromPage !== null) return fromPage;

    return typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
}
