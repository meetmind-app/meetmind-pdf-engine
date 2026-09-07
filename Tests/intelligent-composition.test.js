'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const layoutPath = path.join(repoRoot, 'Layout_Engine', 'layout-engine.js');
const layoutSource = fs.readFileSync(layoutPath, 'utf8');

// Source-level guardrails for the intended composition strategy.
assert.ok(
  layoutSource.includes("buildPage(blocks, modeName, { adaptiveExecutive: true })"),
  'One-page layout still uses the fixed Golden arrangement before considering adaptive row/column composition.'
);
assert.ok(
  layoutSource.includes('chooseAdaptivePairLayout'),
  'Adaptive pair layout selector is missing for row-vs-stack decisions.'
);
assert.ok(
  layoutSource.includes('unusedHeight'),
  'Executive trio candidate scoring does not penalize empty row space.'
);
assert.ok(
  layoutSource.includes('transferCandidates'),
  'Semantic pagination does not evaluate minimal coherent transfer candidates.'
);
assert.ok(
  !layoutSource.includes("const movable = ['tasks', 'architecture']"),
  'Two-page pagination still hardcodes moving Tasks and Architecture together.'
);
assert.ok(
  layoutSource.includes('allocatedHeight'),
  'Continuation page does not allocate available height back into semantic block geometry.'
);
assert.ok(
  !layoutSource.includes('height: Math.min(h, maxY - mode.marginTop)'),
  'Sequential fallback still caps oversized semantic blocks and can clip content.'
);

// Execute the browser IIFE in a small VM so the test validates behavior, not only source markers.
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(layoutSource, sandbox, { filename: 'layout-engine.js' });
const engine = sandbox.window.MeetMindLayoutEngine;
assert.ok(engine && typeof engine.layout === 'function', 'Layout engine did not initialize in the VM.');

function composition(blocks) {
  return { pages: [{ number: 1, blocks }] };
}

function baseBlocks() {
  return [
    { id: 'header', data: {} },
    { id: 'stats', data: { participants: 3, tasks: 2, decisions: 2, risks: 2 } },
    { id: 'summary', data: 'Обсудили продуктовую стратегию, целевые показатели и следующие шаги. Команда согласовала приоритеты и сроки.' },
    { id: 'metrics', data: [
      { label: 'GMV', value: '150 млн ₽' },
      { label: 'Выручка', value: '9 → 14 млрд ₽' },
      { label: 'Доля', value: '30%' },
      { label: 'T2V', value: '2 дня → 5 мин' },
      { label: 'Цель', value: '650 тыс ₽' }
    ] },
    { id: 'insights', data: [
      { title: 'Рынок', description: 'Наиболее сильный эффект ожидается в сценариях с высокой стоимостью ручной работы.' },
      { title: 'Фокус', description: 'Нужна проверка спроса до расширения функциональности.' }
    ] },
    { id: 'decisions', data: [
      { title: 'Запустить пилот', description: 'Проверить готовность платить на ограниченной аудитории.' },
      { title: 'Сохранить международный контур', description: 'Не ограничивать архитектуру одним рынком.' }
    ] },
    { id: 'risks', data: [
      { title: 'Спрос', description: 'Готовность платить пока не подтверждена.' },
      { title: 'Интеграции', description: 'Платежный контур может потребовать альтернативных провайдеров.' }
    ] },
    { id: 'tasks', data: [
      { task: 'Подготовить тестовый лендинг и тарифную сетку', owner: 'Николай', due_date: 'в течение недели' },
      { task: 'Провести первые интервью и проверить willingness to pay', owner: 'Команда', due_date: 'до следующего созвона' }
    ] },
    { id: 'architecture', data: { sections: [
      { title: 'Вход', items: [{ title: 'Сайт', description: 'Описание продукта и ICP' }] },
      { title: 'Анализ', items: [{ title: 'AI', description: 'Исследование и принятие решений' }] },
      { title: 'Действие', items: [{ title: 'Agent', description: 'Исполнение задач и фиксация результата' }] }
    ] } },
    { id: 'owners', data: [{ name: 'Николай' }, { name: 'Команда' }] },
    { id: 'footer', data: {} }
  ];
}

const onePage = engine.layout(composition(baseBlocks()));
assert.ok(onePage.valid, 'Normal report layout must be valid.');
assert.ok(onePage.pageCount >= 1 && onePage.pageCount <= 2, 'Normal report must stay within the 1/2-page product contract.');
assert.ok(
  onePage.pages[0].blocks.some(block => block.layout?.adaptiveComposition === true),
  'Normal report did not use adaptive semantic composition metadata.'
);

// Dense scenario: enough content to exercise compression and minimal-transfer pagination,
// but not an artificial pathological payload that would require semantic block splitting.
const dense = baseBlocks();
dense.find(b => b.id === 'summary').data = (
  'Команда подробно обсудила стратегию продукта, коммерческие ограничения, приоритетные сегменты, критерии успеха и последовательность запуска. '
  + 'Отдельно разобрали экономику, необходимость быстро проверить готовность платить, риски интеграций и требования к международному запуску. '
  + 'Зафиксированы конкретные действия, владельцы и контрольные точки без удаления исходного смысла.'
);
for (const id of ['insights','decisions','risks']) {
  const block = dense.find(b => b.id === id);
  block.data.push(
    { title: 'Дополнительный фактор', description: 'Этот фактор влияет на выбор приоритета и должен оставаться в отчёте полностью, без скрытого сокращения или удаления.' },
    { title: 'Проверка гипотезы', description: 'Нужна отдельная проверка на реальных пользователях с фиксацией результата и следующего решения.' }
  );
}
dense.find(b => b.id === 'tasks').data.push(
  { task: 'Собрать сравнительный анализ альтернатив и проверить ограничения на реальном сценарии', owner: 'Команда продукта', due_date: 'в течение двух недель' },
  { task: 'Подготовить итоговое решение по следующему этапу на основании результатов пилота', owner: 'Николай', due_date: 'после завершения пилота' }
);

const twoPageCandidate = engine.layout(composition(dense));
assert.ok(twoPageCandidate.valid, 'Dense report layout must remain geometrically valid.');
assert.ok(twoPageCandidate.pageCount >= 1 && twoPageCandidate.pageCount <= 2, 'Dense report must stay within the 1/2-page product contract.');

if (twoPageCandidate.pageCount === 2) {
  const secondSemantic = twoPageCandidate.pages[1].blocks.filter(block => ['tasks','architecture'].includes(block.id));
  assert.ok(secondSemantic.length >= 1, 'Continuation page must contain a coherent operational semantic block.');
  assert.ok(
    secondSemantic.some(block => Number(block.layout?.allocatedHeight) >= Number(block.layout?.naturalHeight)),
    'Continuation content did not absorb available vertical geometry.'
  );

  const transferred = new Set(twoPageCandidate.pages[1].transferred || []);
  assert.ok(
    transferred.size <= 2,
    'Pagination moved more semantic blocks than necessary in the dense regression scenario.'
  );
}

console.log('Intelligent composition regression contract passed.');
