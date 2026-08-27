import React, { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTaskStore } from '../stores/TaskStore';
import { getGridScales } from '../utils/grid';
import { canvasFonts, designTokens } from '../styles/designTokens';
import { resizeCanvasForDpr, snapTextPosition, snapLinePosition } from '../utils/canvasDpr';
import { isJapaneseHoliday, japaneseHolidayName } from '../utils/japaneseHolidays';
import { getDayInfo } from '../utils/businessCalendar';
import { GANTT_HEADER_HEIGHT } from '../constants';

export interface TimelineHeaderHandle {
    getCanvas: () => HTMLCanvasElement | null;
}

export const TimelineHeader = React.forwardRef<TimelineHeaderHandle>((_, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { viewport, zoomLevel } = useTaskStore();

    const renderHeader = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cssWidth = Math.max(0, Math.floor(viewport.width));
        const cssHeight = GANTT_HEADER_HEIGHT;

        // Clear
        ctx.clearRect(0, 0, cssWidth, cssHeight);

        // Header Background
        ctx.fillStyle = designTokens.surfaceSubtle;
        ctx.fillRect(0, 0, cssWidth, cssHeight);
        ctx.strokeStyle = designTokens.borderSubtle;
        ctx.strokeRect(0, 0, cssWidth, cssHeight);

        // Calculate Scales
        const scales = getGridScales(viewport, zoomLevel);

        // Determine active rows
        const hasTop = scales.top.length > 0;
        const hasMiddle = scales.middle.length > 0;
        const hasBottom = scales.bottom.length > 0;

        const activeRows = [hasTop, hasMiddle, hasBottom].filter(Boolean).length;
        const rowHeight = activeRows > 0 ? cssHeight / activeRows : cssHeight;
        const dayHeaderExtraHeight = hasMiddle && hasBottom ? 2 : 0;

        let currentY = 0;

        const drawRow = (ticks: typeof scales.top, bgColor: string, txtColor: string, align: 'left' | 'center' = 'left', height = rowHeight) => {
            if (ticks.length === 0) return;

            const y = currentY;
            const h = height;

            // Background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, y, cssWidth, h);

            // Bottom border
            ctx.strokeStyle = designTokens.borderStrong;
            ctx.beginPath();
            ctx.moveTo(0, snapLinePosition(y + h));
            ctx.lineTo(cssWidth, snapLinePosition(y + h));
            ctx.stroke();

            ctx.fillStyle = txtColor;
            ctx.font = canvasFonts.header;
            ctx.textAlign = align;

            ticks.forEach((tick, i) => {
                // Vertical Separator
                const snappedX = snapLinePosition(tick.x);
                ctx.beginPath();
                ctx.moveTo(snappedX, y);
                ctx.lineTo(snappedX, y + h);
                ctx.strokeStyle = designTokens.borderStrong;
                ctx.stroke();

                // Text
                let nextX = cssWidth;
                if (i < ticks.length - 1) {
                    nextX = ticks[i + 1].x;
                }

                const width = nextX - tick.x;
                const textY = y + h / 2 + 4; // Vertically center approx

                let textX = tick.x;
                if (align === 'center') {
                    textX = tick.x + width / 2;
                    // For center, we assume width is controlled. 
                } else {
                    // Sticky-like or Left Padding
                    textX = Math.max(tick.x, 0) + 4;
                }

                if (tick.x < cssWidth && (align === 'center' ? tick.x + width > 0 : textX < nextX - 10)) {
                    ctx.save();
                    ctx.beginPath();
                    // Snap to pixels to avoid sub-pixel misalignment with separator lines
                    const startX = Math.floor(tick.x);
                    // Ensure we don't clip partially into the next cell's separator
                    const endX = Math.floor(nextX);
                    ctx.rect(startX, y, Math.max(0, endX - startX), h);
                    ctx.clip();
                    ctx.fillText(tick.label, snapTextPosition(textX), snapTextPosition(textY));
                    ctx.restore();
                }
            });

            currentY += h;
        };

        // Customize colors per row "level"

        if (hasTop) drawRow(scales.top, designTokens.surfaceMuted, designTokens.textSecondary);

        // Middle Row
        const middleAlign: 'left' | 'center' = 'left';
        const middleBg = zoomLevel === 0 ? designTokens.surfaceMuted : designTokens.appBg;
        const middleTxt = zoomLevel === 0 ? designTokens.textSecondary : designTokens.textPrimary;
        if (hasMiddle) drawRow(scales.middle, middleBg, middleTxt, middleAlign, rowHeight - dayHeaderExtraHeight);

        if (hasBottom) {
            const y = currentY;
            const h = rowHeight + dayHeaderExtraHeight;

            // Background (base)
            ctx.fillStyle = designTokens.appBg;
            ctx.fillRect(0, y, cssWidth, h);

            // Non-working days: the business calendar (including project-specific
            // holidays) plus the built-in Japanese holiday calculation.
            if (zoomLevel === 2) { // Day View mainly
                scales.bottom.forEach((tick, i) => {
                    const dayInfo = getDayInfo(tick.time, window.RedmineCanvasGantt?.projectId);
                    const holiday = isJapaneseHoliday(new Date(tick.time))
                        || (dayInfo.type === 'non_working' && dayInfo.source === 'override');
                    if (dayInfo.type === 'non_working' || holiday) {
                        let w = 50; // default
                        if (i < scales.bottom.length - 1) w = scales.bottom[i + 1].x - tick.x;
                        else w = (24 * 3600 * 1000 * viewport.scale);

                        ctx.fillStyle = holiday ? designTokens.holidayBg : designTokens.weekendBg;
                        ctx.fillRect(tick.x, y, w, h);
                    }
                });
            }

            // Draw Ticks/Text
            ctx.fillStyle = designTokens.textPrimary;
            ctx.textAlign = 'center'; // Always center bottom (Days)

            scales.bottom.forEach((tick, i) => {
                const snappedX = snapLinePosition(tick.x);
                ctx.beginPath();
                ctx.moveTo(snappedX, y);
                ctx.lineTo(snappedX, y + h);
                ctx.strokeStyle = designTokens.borderSubtle;
                ctx.stroke();

                // Width for centering
                let nextX = cssWidth;
                if (i < scales.bottom.length - 1) nextX = scales.bottom[i + 1].x;
                const width = nextX - tick.x;

                const textX = tick.x + width / 2;
                const textY = tick.secondaryLabel ? y + 10 : y + h / 2 + 4;

                ctx.font = canvasFonts.header;
                // Colour day labels like a Japanese calendar: Sundays and holidays
                // red, Saturdays blue (day view only; other zooms keep the base
                // colour). Calendar day overrides count as holidays, weekly
                // non-working days do not.
                if (zoomLevel === 2) {
                    const d = new Date(tick.time);
                    const dow = d.getDay();
                    const info = getDayInfo(tick.time, window.RedmineCanvasGantt?.projectId);
                    const holiday = isJapaneseHoliday(d)
                        || (info.type === 'non_working' && info.source === 'override');
                    if (holiday || dow === 0) ctx.fillStyle = designTokens.dayLabelSunday;
                    else if (dow === 6) ctx.fillStyle = designTokens.dayLabelSaturday;
                    else ctx.fillStyle = designTokens.textPrimary;
                }

                ctx.fillText(tick.label, snapTextPosition(textX), snapTextPosition(textY));
                if (tick.secondaryLabel) {
                    ctx.font = canvasFonts.header.replace('11px', '10px');
                    ctx.fillStyle = designTokens.textSecondary;
                    ctx.fillText(tick.secondaryLabel, snapTextPosition(textX), snapTextPosition(y + h - 3));
                    ctx.fillStyle = designTokens.textPrimary;
                }
            });

            currentY += h;
        }
    }, [viewport, zoomLevel]);

    // Keep header canvas size aligned and render in the same layout pass so DPR
    // transforms are applied before any drawing for the frame.
    useLayoutEffect(() => {
        if (!canvasRef.current) return;
        const width = Math.max(0, Math.floor(viewport.width));
        const ctx = canvasRef.current.getContext('2d');
        resizeCanvasForDpr(canvasRef.current, ctx, width, GANTT_HEADER_HEIGHT);
        renderHeader();
    }, [renderHeader, viewport.width]);

    useImperativeHandle(ref, () => ({
        getCanvas: () => canvasRef.current
    }), []);

    // Holiday-name tooltip (day view). Rendered as a custom element positioned to
    // the upper-right of the cursor — the native title tooltip sits under the
    // cursor and is hard to read. Portaled to <body> so it is never clipped.
    const [holidayTip, setHolidayTip] = useState<{ x: number; y: number; text: string } | null>(null);
    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || zoomLevel !== 2) { setHolidayTip(null); return; }
        const x = event.clientX - canvas.getBoundingClientRect().left;
        const ticks = getGridScales(viewport, zoomLevel).bottom;
        let text = '';
        for (let i = 0; i < ticks.length; i++) {
            const nextX = i < ticks.length - 1 ? ticks[i + 1].x : Infinity;
            if (x >= ticks[i].x && x < nextX) {
                // Prefer the name configured in the business calendar; fall back to
                // the built-in Japanese holiday name.
                const info = getDayInfo(ticks[i].time, window.RedmineCanvasGantt?.projectId);
                const calendarName = info.type === 'non_working' && info.source === 'override'
                    ? info.name
                    : null;
                text = calendarName || japaneseHolidayName(new Date(ticks[i].time)) || '';
                break;
            }
        }
        setHolidayTip(text ? { x: event.clientX, y: event.clientY, text } : null);
    }, [viewport, zoomLevel]);
    const handleMouseLeave = useCallback(() => setHolidayTip(null), []);

    return (
        <div style={{ height: GANTT_HEADER_HEIGHT, boxSizing: 'border-box', flexShrink: 0, backgroundColor: designTokens.surfaceSubtle, borderBottom: `1px solid ${designTokens.borderSubtle}`, overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                height={GANTT_HEADER_HEIGHT}
                style={{ display: 'block' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
            {holidayTip && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        left: holidayTip.x + 12,
                        top: holidayTip.y - 12,
                        transform: 'translateY(-100%)',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        background: designTokens.tooltipBg,
                        color: designTokens.tooltipFg,
                        font: canvasFonts.body,
                        padding: '3px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        boxShadow: designTokens.tooltipShadow,
                    }}
                >
                    {holidayTip.text}
                </div>,
                document.body
            )}
        </div>
    );
});

TimelineHeader.displayName = 'TimelineHeader';
