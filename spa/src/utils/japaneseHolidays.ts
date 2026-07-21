// Japanese national holidays (日本の祝日) — self-contained, no external deps.
//
// Covers fixed-date holidays, Happy-Monday holidays, the vernal/autumnal
// equinoxes (astronomical approximation, valid roughly 1948–2099), plus the
// derived holidays: substitute holidays (振替休日) and citizen's holidays
// (国民の休日). Intended for highlighting non-working days on the Gantt.
//
// Public API: isJapaneseHoliday(date) / japaneseHolidayName(date).

// Vernal equinox day for a given year (valid ~1980–2099).
function vernalEquinoxDay(year: number): number {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// Autumnal equinox day for a given year (valid ~1980–2099).
function autumnalEquinoxDay(year: number): number {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

// Returns the base (statutory, non-derived) holiday name for the given local
// date components, or null. dow: 0=Sun .. 6=Sat.
function baseHolidayName(year: number, month: number, day: number, dow: number): string | null {
    switch (month) {
        case 1:
            if (day === 1) return '元日';
            if (year >= 2000) {
                if (dow === 1 && day >= 8 && day <= 14) return '成人の日';
            } else if (day === 15) {
                return '成人の日';
            }
            break;
        case 2:
            if (day === 11) return '建国記念の日';
            if (year >= 2020 && day === 23) return '天皇誕生日';
            break;
        case 3:
            if (day === vernalEquinoxDay(year)) return '春分の日';
            break;
        case 4:
            if (day === 29) {
                if (year >= 2007) return '昭和の日';
                if (year >= 1989) return 'みどりの日';
                return '天皇誕生日';
            }
            break;
        case 5:
            if (day === 3) return '憲法記念日';
            if (day === 4 && year >= 2007) return 'みどりの日';
            if (day === 5) return 'こどもの日';
            break;
        case 7:
            if (year === 2020 && day === 23) return '海の日';
            else if (year === 2021 && day === 22) return '海の日';
            else if (year >= 2003) {
                if (dow === 1 && day >= 15 && day <= 21) return '海の日';
            } else if (year >= 1996 && day === 20) {
                return '海の日';
            }
            break;
        case 8:
            if (year === 2020 && day === 10) return '山の日';
            else if (year === 2021 && day === 8) return '山の日';
            else if (year >= 2016 && day === 11) return '山の日';
            break;
        case 9:
            if (year >= 2003) {
                if (dow === 1 && day >= 15 && day <= 21) return '敬老の日';
            } else if (year >= 1966 && day === 15) {
                return '敬老の日';
            }
            if (day === autumnalEquinoxDay(year)) return '秋分の日';
            break;
        case 10:
            if (year === 2020 && day === 24) return 'スポーツの日';
            else if (year === 2021 && day === 23) return 'スポーツの日';
            else if (year >= 2000) {
                if (dow === 1 && day >= 8 && day <= 14) return year >= 2020 ? 'スポーツの日' : '体育の日';
            } else if (year >= 1966 && day === 10) {
                return '体育の日';
            }
            break;
        case 11:
            if (day === 3) return '文化の日';
            if (day === 23) return '勤労感謝の日';
            break;
        case 12:
            if (year >= 1989 && year <= 2018 && day === 23) return '天皇誕生日';
            break;
    }
    return null;
}

function baseHolidayForDate(date: Date): string | null {
    return baseHolidayName(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getDay());
}

// 振替休日: the first non-holiday day following a holiday that fell on a Sunday
// (walking across any consecutive holidays). Enforced since 1973.
function substituteHolidayName(date: Date): string | null {
    if (date.getFullYear() < 1973) return null;
    if (baseHolidayForDate(date)) return null;
    const cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    for (;;) {
        cursor.setDate(cursor.getDate() - 1);
        if (!baseHolidayForDate(cursor)) return null;
        if (cursor.getDay() === 0) return '振替休日';
    }
}

// 国民の休日: a weekday (not Sunday) sandwiched between two holidays. Since 1988.
function citizensHolidayName(date: Date): string | null {
    if (date.getFullYear() < 1988) return null;
    if (date.getDay() === 0) return null;
    if (baseHolidayForDate(date)) return null;
    const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    if (baseHolidayForDate(prev) && baseHolidayForDate(next)) return '国民の休日';
    return null;
}

const nameCache = new Map<number, string | null>();

/** Returns the holiday name for a local date, or null if it is not a holiday. */
export function japaneseHolidayName(date: Date): string | null {
    const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const cached = nameCache.get(key);
    if (cached !== undefined) return cached;
    const name = baseHolidayForDate(date) ?? substituteHolidayName(date) ?? citizensHolidayName(date);
    nameCache.set(key, name);
    return name;
}

/** True when the given local date is a Japanese national holiday. */
export function isJapaneseHoliday(date: Date): boolean {
    return japaneseHolidayName(date) !== null;
}
