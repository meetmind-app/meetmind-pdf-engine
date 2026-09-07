function generateToken(length = 16) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

function normalizeReportLanguage(value) {
  const raw = String(value || 'en').trim().replace(/_/g, '-').toLowerCase();

  // Product locale is Portuguese (Brazil), while the persisted/runtime key
  // remains `pt` for backward compatibility with existing Web, DB and reports.
  if (raw === 'pt' || raw === 'pt-br' || raw.startsWith('pt-')) return 'pt';
  if (raw === 'in' || raw.startsWith('in-')) return 'id';

  const base = raw.split('-')[0];
  const supported = ['ru','en','es','tr','id','hi','ar','uz','fa'];
  return supported.includes(base) ? base : 'en';
}

const item = $input.first().json;
const now = new Date().toISOString();

const context = $('Normalize Processing Context').first().json;
const reportLanguage = normalizeReportLanguage(
  context.meeting_language ||
  context.language ||
  'en'
);

const rawDurationSeconds = Number(
  $('Transcribe a recording3').first().json.usage?.seconds || 0
);

const durationSeconds =
  Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
    ? Math.ceil(rawDurationSeconds)
    : null;

const shareToken = generateToken();

const reportJson = {
  schema_version: '1.1',

  headline: item.headline,
  title: item.meeting_title,
  subtitle: item.meeting_subtitle,
  objective: item.meeting_objective,

  meeting_type: item.meeting_type,
  meeting_type_label: item.meeting_type_label || '',
  importance: item.meeting_importance,
  importance_reason: item.importance_reason,
  series_title: item.series_title || '',

  language: reportLanguage,

  executive_brief: item.executive_brief,
  key_metrics: item.key_metrics || [],
  key_takeaways: item.key_takeaways || [],
  decisions: item.decisions || [],
  architecture: item.architecture || { sections: [] },
  risks: item.risks || [],
  dependencies: item.dependencies || [],
  tasks: item.tasks || [],
  owners: item.owners || [],

  participants: [],

  stats: {
    duration_seconds: durationSeconds
  }
};

return [
  {
    json: {
      ...item,

      share_token: shareToken,
      report_language: reportLanguage,

      status: 'processed',
      duration_seconds: durationSeconds,
      source_file_type: null,

      report_json: reportJson,
      participants: [],

      branding_visible: true,
      processed_at: now,
      updated_at: now,
      deleted_at: null
    }
  }
];
