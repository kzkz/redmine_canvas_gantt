import React from 'react';
import { getColorSchemeSetting, setColorSchemeSetting, type ColorSchemeSetting } from '../utils/colorScheme';
import { designTokens } from '../styles/designTokens';

const ORDER: ColorSchemeSetting[] = ['auto', 'light', 'dark'];
const LABEL: Record<ColorSchemeSetting, string> = { auto: '自動', light: 'ライト', dark: 'ダーク' };
const ICON: Record<ColorSchemeSetting, string> = { auto: '◐', light: '☀', dark: '☾' };

// Dark/light toggle for the Gantt toolbar. The choice is persisted globally
// (per browser origin, i.e. across all projects for the user). The palette is
// resolved at load, so applying a change simply reloads the page. Styled as a
// 32px icon button to match the other toolbar controls.
export const ColorSchemeToggle: React.FC = () => {
    const current = getColorSchemeSetting();
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

    const handleClick = () => {
        setColorSchemeSetting(next);
        window.location.reload();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            title={`表示テーマ: ${LABEL[current]}（クリックで${LABEL[next]}へ）`}
            aria-label={`表示テーマ切替（現在: ${LABEL[current]}）`}
            style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: `1px solid ${designTokens.controlBorder}`,
                backgroundColor: designTokens.controlBg,
                color: designTokens.controlFg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                lineHeight: 1,
            }}
        >
            <span aria-hidden="true">{ICON[current]}</span>
        </button>
    );
};
