const fs = require('fs');
const path = require('path');
const assert = require('assert');

const prompt = fs.readFileSync(path.join(__dirname, '..', 'Documentation', 'n8n-intelligence-engine-v1.2-ready.txt'), 'utf8');

const required = [
  'LOREVI Intelligence Engine v1.2',
  'meeting_type_label',
  'interview, retrospective, workshop, one_on_one, review',
  'current_value',
  'previous_value',
  'target_value',
  'target_period',
  'current_to_target',
  'previous_to_current',
  '"impact": ""',
  '"mitigation": ""',
  'layout="process" ONLY',
  'layout="components"',
  'Never invent causal impact or mitigation',
  'Do not generate system-derived duration',
  "{{ $('Create Transcript File').first().json.transcript }}"
];

for (const token of required) {
  assert(prompt.includes(token), `Prompt contract missing: ${token}`);
}

const forbidden = [
  'You are MeetMind Intelligence Engine v1.0',
  'duration_seconds":',
  'participant_count":',
  'billing":'
];

for (const token of forbidden) {
  assert(!prompt.includes(token), `Prompt contract contains forbidden output token: ${token}`);
}

console.log('Intelligence Engine v1.2 prompt contract: OK');
