const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

if (!geminiApiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set. Gemini services are disabled.');
}
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.0-flash'
].filter(Boolean);

function mapGeminiError(error, fallbackMessage) {
  const rawMessage = error?.message || '';
  let statusCode = error?.statusCode || error?.response?.status;

  if (!statusCode) {
    if (/429/.test(rawMessage)) {
      statusCode = 429;
    } else if (/403/.test(rawMessage)) {
      statusCode = 403;
    } else if (/401/.test(rawMessage)) {
      statusCode = 401;
    } else if (/404/.test(rawMessage)) {
      statusCode = 503;
    }
  }

  let clientMessage = fallbackMessage;

  switch (statusCode) {
    case 429:
      clientMessage = 'Gemini API rate limit reached. Please wait a few minutes and try again.';
      break;
    case 403:
      clientMessage = 'Gemini API request forbidden. Please check API key permissions or billing.';
      break;
    case 401:
      clientMessage = 'Gemini API key is invalid or unauthorized. Verify your GEMINI_API_KEY.';
      break;
    case 503:
      clientMessage = 'Gemini model not available. Please try again later or update GEMINI_MODEL.';
      break;
    default:
      clientMessage = fallbackMessage;
  }

  const mappedError = new Error(clientMessage);
  mappedError.statusCode = statusCode || 500;
  mappedError.details = rawMessage;
  mappedError.cause = error;
  mappedError.clientMessage = clientMessage;

  return mappedError;
}

function ensureClient() {
  if (!genAI) {
    throw new Error('Gemini AI client not initialized. Please configure GEMINI_API_KEY.');
  }
}

function getModel() {
  ensureClient();
  let lastError = null;
  for (const modelName of FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return { model, modelName };
    } catch (error) {
      lastError = error;
      console.error(`⚠️  Failed to initialize Gemini model "${modelName}": ${error.message}`);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to initialize Gemini model. Set GEMINI_MODEL to a supported model name.');
}

/**
 * Analyze a single student report using Gemini AI
 * @param {Object} report - Report object with title and description
 * @returns {Promise<Object>} - AI analysis results
 */
async function analyzeStudentReport(report) {
  try {
    const { model, modelName } = getModel();
    console.log(`✨ Using Gemini model for analysis: ${modelName}`);
    
    const prompt = `
Analyze the following NSS student event report and provide:
1. A brief summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Learnings and outcomes
4. Community impact
5. Recommendations for improvement

Report Title: ${report.title}
Event: ${report.event?.title || 'Unknown Event'}
Description: ${report.description}

Provide the response in JSON format with these fields:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "learnings": ["...", "..."],
  "impact": "...",
  "recommendations": ["...", "..."]
}
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      summary: text.substring(0, 300),
      keyPoints: [],
      learnings: [],
      impact: '',
      recommendations: []
    };
  } catch (error) {
    console.error('Gemini AI analysis error:', error);
    throw mapGeminiError(error, 'Failed to analyze report with AI');
  }
}

/**
 * Generate consolidated NAAC/UGC report from multiple student reports
 * @param {Array} reports - Array of report objects
 * @param {String} academicYear - Academic year
 * @param {String} reportType - 'NAAC' or 'UGC'
 * @returns {Promise<Object>} - Consolidated report
 */
async function generateConsolidatedReport(reports, academicYear, reportType = 'NAAC') {
  try {
    const { model, modelName } = getModel();
    console.log(`✨ Using Gemini model for consolidated report: ${modelName}`);
    
    // Prepare summary of all reports
    const reportsSummary = reports.map((r, idx) => `
Report ${idx + 1}:
Event: ${r.event?.title || 'Unknown'}
Student: ${r.student?.name || 'Unknown'}
Summary: ${r.aiSummary || r.description.substring(0, 200)}
Date: ${r.event?.startDate ? new Date(r.event.startDate).toLocaleDateString() : 'Unknown'}
`).join('\n');
    
    const totalStudents = new Set(reports.map(r => r.student?._id?.toString())).size;
    const totalEvents = new Set(reports.map(r => r.event?._id?.toString())).size;
    
    const prompt = `
Generate a comprehensive ${reportType} report for NSS activities for Academic Year ${academicYear}.

Statistics:
- Total Events: ${totalEvents}
- Total Student Reports: ${reports.length}
- Total Students Participated: ${totalStudents}

Individual Reports Summary:
${reportsSummary}

Generate a professional ${reportType} format report with:
1. Executive Summary
2. Overview of NSS Activities
3. Key Achievements and Outcomes
4. Community Impact Assessment
5. Student Participation and Engagement Metrics
6. Skills and Competencies Developed
7. Challenges and Learnings
8. Recommendations for Future
9. Conclusion

Format the report in a structured, professional manner suitable for ${reportType} submission.
Include specific data points, statistics, and measurable outcomes.
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const consolidatedReport = response.text();
    
    return {
      reportType,
      academicYear,
      totalEvents,
      totalReports: reports.length,
      totalStudents,
      generatedAt: new Date(),
      content: consolidatedReport,
      statistics: {
        eventsBreakdown: getEventsBreakdown(reports),
        participationTrends: getParticipationTrends(reports),
        impactMetrics: await calculateImpactMetrics(reports)
      }
    };
  } catch (error) {
    console.error('Consolidated report generation error:', error);
    throw mapGeminiError(error, 'Failed to generate consolidated report');
  }
}

/**
 * Generate summary for a specific event from all student reports
 * @param {Array} reports - Array of report objects for the event
 * @param {Object} event - Event object
 * @returns {Promise<String>} - Event summary
 */
async function generateEventSummary(reports, event) {
  try {
    const { model, modelName } = getModel();
    console.log(`✨ Using Gemini model for event summary: ${modelName}`);
    
    const reportsSummary = reports.map((r, idx) => `
Student ${idx + 1}: ${r.student?.name || 'Unknown'}
${r.description.substring(0, 300)}
`).join('\n\n');
    
    const prompt = `
Generate a comprehensive summary for the following NSS event based on student reports:

Event: ${event.title}
Date: ${new Date(event.startDate).toLocaleDateString()} to ${new Date(event.endDate).toLocaleDateString()}
Location: ${event.location}
Total Reports: ${reports.length}

Student Reports:
${reportsSummary}

Generate a summary covering:
1. Event overview and objectives
2. Activities conducted
3. Student participation and engagement
4. Community impact
5. Key outcomes and learnings
6. Overall success metrics

Keep the summary professional and concise (300-500 words).
`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Event summary generation error:', error);
    throw mapGeminiError(error, 'Failed to generate event summary');
  }
}

/**
 * Get breakdown of events by category
 */
function getEventsBreakdown(reports) {
  const breakdown = {};
  reports.forEach(r => {
    const category = r.event?.category || 'Other';
    breakdown[category] = (breakdown[category] || 0) + 1;
  });
  return breakdown;
}

/**
 * Get participation trends over time
 */
function getParticipationTrends(reports) {
  const trends = {};
  reports.forEach(r => {
    if (r.event?.startDate) {
      const month = new Date(r.event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      trends[month] = (trends[month] || 0) + 1;
    }
  });
  return trends;
}

/**
 * Calculate impact metrics from reports
 */
async function calculateImpactMetrics(reports) {
  const totalHours = reports.reduce((sum, r) => sum + (r.event?.volunteerHours || 0), 0);
  const beneficiaries = reports.reduce((sum, r) => sum + (r.event?.expectedParticipants || 0), 0);
  
  return {
    totalVolunteerHours: totalHours,
    estimatedBeneficiaries: beneficiaries,
    averageReportLength: Math.round(
      reports.reduce((sum, r) => sum + r.description.length, 0) / reports.length
    )
  };
}

module.exports = {
  analyzeStudentReport,
  generateConsolidatedReport,
  generateEventSummary
};
