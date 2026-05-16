const AcademicYearConfig = require('../models/AcademicYearConfig');

function normalizeAcademicYearLabel(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  const compactRangeMatch = raw.match(/^(\d{4})\s*[-/]\s*(\d{2}|\d{4})$/);
  if (compactRangeMatch) {
    const startYear = compactRangeMatch[1];
    const endPart = compactRangeMatch[2];
    const endYear = endPart.length === 2 ? `${startYear.slice(0, 2)}${endPart}` : endPart;
    return `${startYear}-${endYear}`;
  }

  const startYearMatch = raw.match(/^(\d{4})$/);
  if (startYearMatch) {
    return startYearMatch[1];
  }

  return raw;
}

function buildRangeFromConfig(config) {
  if (!config || !config.yearLabel) {
    return null;
  }

  const label = normalizeAcademicYearLabel(config.yearLabel);
  const match = label.match(/^(\d{4})-(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }

  const startYear = parseInt(match[1], 10);
  const endYear = match[2].length === 2 ? parseInt(`${String(startYear).slice(0, 2)}${match[2]}`, 10) : parseInt(match[2], 10);
  const startMonth = Number(config.startMonth);
  const endMonth = Number(config.endMonth);

  if (!Number.isFinite(startMonth) || !Number.isFinite(endMonth) || startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
    return null;
  }

  const rangeStart = new Date(startYear, startMonth - 1, 1, 0, 0, 0, 0);
  const rangeEndYear = endMonth >= startMonth ? startYear : endYear;
  const rangeEnd = new Date(rangeEndYear, endMonth, 0, 23, 59, 59, 999);

  return {
    label,
    rangeStart,
    rangeEnd,
    startMonth,
    endMonth
  };
}

function buildDefaultAcademicYearContext(date = new Date()) {
  const referenceDate = new Date(date);
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const startYear = month >= 6 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    label: `${startYear}-${String(endYear).slice(-2)}`,
    rangeStart: new Date(startYear, 5, 1, 0, 0, 0, 0),
    rangeEnd: new Date(endYear, 4, 31, 23, 59, 59, 999),
    startMonth: 6,
    endMonth: 5,
    source: 'fallback'
  };
}

function buildContextFromStartYear(startYearValue) {
  const startYear = Number(startYearValue);
  if (!Number.isFinite(startYear)) {
    return null;
  }

  const endYear = startYear + 1;

  return {
    label: `${startYear}-${String(endYear).slice(-2)}`,
    rangeStart: new Date(startYear, 5, 1, 0, 0, 0, 0),
    rangeEnd: new Date(endYear, 4, 31, 23, 59, 59, 999),
    startMonth: 6,
    endMonth: 5,
    source: 'legacy'
  };
}

async function getActiveAcademicYearConfigs() {
  return AcademicYearConfig.find({ isActive: true }).sort({ createdAt: -1 });
}

async function resolveAcademicYearContext(input, date = new Date()) {
  const configs = await getActiveAcademicYearConfigs();
  const normalizedInput = normalizeAcademicYearLabel(input);

  if (normalizedInput) {
    const exactMatch = configs.find((config) => normalizeAcademicYearLabel(config.yearLabel) === normalizedInput);
    if (exactMatch) {
      const range = buildRangeFromConfig(exactMatch) || buildDefaultAcademicYearContext(date);
      return {
        ...range,
        config: exactMatch,
        source: 'config'
      };
    }

    if (/^\d{4}$/.test(normalizedInput)) {
      const prefixMatch = configs.find((config) => normalizeAcademicYearLabel(config.yearLabel).startsWith(`${normalizedInput}-`));
      if (prefixMatch) {
        const range = buildRangeFromConfig(prefixMatch) || buildDefaultAcademicYearContext(date);
        return {
          ...range,
          config: prefixMatch,
          source: 'config'
        };
      }

      const legacyContext = buildContextFromStartYear(normalizedInput);
      if (legacyContext) {
        return legacyContext;
      }
    }
  }

  const matchedByDate = configs.find((config) => {
    const range = buildRangeFromConfig(config);
    return range && date >= range.rangeStart && date <= range.rangeEnd;
  });

  if (matchedByDate) {
    const range = buildRangeFromConfig(matchedByDate) || buildDefaultAcademicYearContext(date);
    return {
      ...range,
      config: matchedByDate,
      source: 'config'
    };
  }

  return buildDefaultAcademicYearContext(date);
}

module.exports = {
  normalizeAcademicYearLabel,
  buildRangeFromConfig,
  buildDefaultAcademicYearContext,
  buildContextFromStartYear,
  resolveAcademicYearContext
};