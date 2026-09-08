const d = $input.first().json;

const SUPPORTED_LANGUAGES = ['ru','en','es','pt','tr','id','hi','ar','uz','fa'];
function normalizeTelegramLanguage(value){
  const raw=String(value||'en').trim().replace(/_/g,'-').toLowerCase();
  if(raw==='pt'||raw==='pt-br'||raw.startsWith('pt-'))return 'pt';
  if(raw==='in'||raw.startsWith('in-'))return 'id';
  const base=raw.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base)?base:'en';
}
const rawLanguage = d.report_language || d.meeting_language || d.language || d.report_json?.language || 'en';
const lang = normalizeTelegramLanguage(rawLanguage);

const i18n = {
  ru:{executive_brief:'Краткое резюме',key_metrics:'Ключевые метрики',key_takeaways:'Основные выводы',decisions:'Решения',tasks:'Задачи',risks:'Риски',architecture:'Архитектура и процесс',owners:'Владельцы',impact:'Влияние',mitigation:'Меры',open_report:'📊 Открыть отчёт',share_report:'↗️ Поделиться',full_details:'Полная версия — в Web Report'},
  en:{executive_brief:'Executive Brief',key_metrics:'Key Metrics',key_takeaways:'Key Takeaways',decisions:'Decisions',tasks:'Tasks',risks:'Risks',architecture:'Architecture & Process',owners:'Owners',impact:'Impact',mitigation:'Mitigation',open_report:'📊 Open report',share_report:'↗️ Share',full_details:'Full version is available in Web Report'},
  es:{executive_brief:'Resumen ejecutivo',key_metrics:'Métricas clave',key_takeaways:'Conclusiones clave',decisions:'Decisiones',tasks:'Tareas',risks:'Riesgos',architecture:'Arquitectura y proceso',owners:'Responsables',impact:'Impacto',mitigation:'Mitigación',open_report:'📊 Abrir informe',share_report:'↗️ Compartir',full_details:'La versión completa está en el informe web'},
  pt:{executive_brief:'Resumo executivo',key_metrics:'Métricas principais',key_takeaways:'Principais conclusões',decisions:'Decisões',tasks:'Tarefas',risks:'Riscos',architecture:'Arquitetura e processo',owners:'Responsáveis',impact:'Impacto',mitigation:'Mitigação',open_report:'📊 Abrir relatório',share_report:'↗️ Compartilhar',full_details:'A versão completa está no relatório web'},
  tr:{executive_brief:'Yönetici özeti',key_metrics:'Temel metrikler',key_takeaways:'Temel çıkarımlar',decisions:'Kararlar',tasks:'Görevler',risks:'Riskler',architecture:'Mimari ve süreç',owners:'Sorumlular',impact:'Etki',mitigation:'Önlem',open_report:'📊 Raporu aç',share_report:'↗️ Paylaş',full_details:'Tam sürüm Web Raporunda'},
  id:{executive_brief:'Ringkasan eksekutif',key_metrics:'Metrik utama',key_takeaways:'Kesimpulan utama',decisions:'Keputusan',tasks:'Tugas',risks:'Risiko',architecture:'Arsitektur & proses',owners:'Penanggung jawab',impact:'Dampak',mitigation:'Mitigasi',open_report:'📊 Buka laporan',share_report:'↗️ Bagikan',full_details:'Versi lengkap tersedia di Web Report'},
  hi:{executive_brief:'कार्यकारी सारांश',key_metrics:'प्रमुख मेट्रिक्स',key_takeaways:'मुख्य निष्कर्ष',decisions:'निर्णय',tasks:'कार्य',risks:'जोखिम',architecture:'आर्किटेक्चर और प्रक्रिया',owners:'जिम्मेदार',impact:'प्रभाव',mitigation:'निवारण',open_report:'📊 रिपोर्ट खोलें',share_report:'↗️ साझा करें',full_details:'पूरा संस्करण Web Report में उपलब्ध है'},
  ar:{executive_brief:'الملخص التنفيذي',key_metrics:'المؤشرات الرئيسية',key_takeaways:'أهم الاستنتاجات',decisions:'القرارات',tasks:'المهام',risks:'المخاطر',architecture:'البنية والعملية',owners:'المسؤولون',impact:'الأثر',mitigation:'التخفيف',open_report:'فتح التقرير 📊',share_report:'مشاركة ↗️',full_details:'النسخة الكاملة متاحة في تقرير الويب'},
  uz:{executive_brief:'Ijrochi xulosa',key_metrics:'Asosiy ko‘rsatkichlar',key_takeaways:'Asosiy xulosalar',decisions:'Qarorlar',tasks:'Vazifalar',risks:'Xatarlar',architecture:'Arxitektura va jarayon',owners:'Mas’ullar',impact:'Ta’sir',mitigation:'Chora',open_report:'📊 Hisobotni ochish',share_report:'↗️ Ulashish',full_details:'To‘liq versiya Web Reportda'},
  fa:{executive_brief:'خلاصه اجرایی',key_metrics:'شاخص‌های کلیدی',key_takeaways:'نکات کلیدی',decisions:'تصمیم‌ها',tasks:'وظایف',risks:'ریسک‌ها',architecture:'معماری و فرایند',owners:'مسئولان',impact:'اثر',mitigation:'کاهش ریسک',open_report:'باز کردن گزارش 📊',share_report:'اشتراک‌گذاری ↗️',full_details:'نسخه کامل در گزارش وب موجود است'}
};
const t=i18n[lang]||i18n.en;
const MAX_REPORT_CHARS=3900;
let sections=[];

function text(v){return v===undefined||v===null?'':String(v).trim();}
function hasValue(v){
  const s=text(v); if(!s)return false;
  const empty=['Не указано','Not specified','No especificado','No especificada','Não especificado','Não especificada','Belirtilmemiş','Tidak disebutkan','उल्लेख नहीं किया गया','غير محدد','غير مذكور','Ko‘rsatilmagan',"Ko'rsatilmagan",'مشخص نشده','ذکر نشده'];
  return !empty.includes(s);
}
function list(items,formatter){return Array.isArray(items)?items.map(formatter).filter(Boolean).join('\n'):'';}
function pushSection(title,content){const c=text(content);if(c)sections.push(`${title}\n\n${c}`);}
function detailsLine(item){return text(item?.details||item?.description);}
function metricValue(x){
  if(text(x?.value))return text(x.value);
  const relation=text(x?.relation).toLowerCase();
  const current=text(x?.current_value), previous=text(x?.previous_value), target=text(x?.target_value);
  if(relation==='current_to_target'&&current&&target)return `${current} → ${target}`;
  if(relation==='previous_to_current'&&previous&&current)return `${previous} → ${current}`;
  if(relation==='target'&&target)return target;
  if(relation==='current'&&current)return current;
  return current||target||previous;
}
function metricContext(x){
  const context=text(x?.context),period=text(x?.target_period);
  if(!period)return context;if(!context)return period;
  return context.toLowerCase().includes(period.toLowerCase())?context:`${context} · ${period}`;
}

let header='';
if(d.meeting_title)header+=`📋 ${d.meeting_title}`;
if(text(d.meeting_type_label))header+=`${header?'\n':''}🏷 ${d.meeting_type_label}`;
if(header)sections.push(header);

pushSection(`📌 ${t.executive_brief}`,d.executive_brief);
pushSection(`📊 ${t.key_metrics}`,list(d.key_metrics,x=>{
  if(!x?.label)return '';
  const value=metricValue(x);if(!value)return '';
  const context=metricContext(x);
  return `• ${x.label}: ${value}${context?`\n  ↳ ${context}`:''}`;
}));
pushSection(`💡 ${t.key_takeaways}`,list(d.key_takeaways,x=>{
  if(!x?.title)return '';
  const details=detailsLine(x);
  return `• ${x.title}${details?`\n  ${details}`:''}`;
}));
pushSection(`✅ ${t.decisions}`,list(d.decisions,x=>{
  if(!x?.title)return '';
  const details=detailsLine(x);
  return `• ${x.title}${details?`\n  ${details}`:''}`;
}));
pushSection(`📋 ${t.tasks}`,list(d.tasks,x=>{
  if(!x?.task)return '';
  let line=`• ${x.task}`;
  if(hasValue(x.owner))line+=` — ${x.owner}`;
  if(hasValue(x.due_date))line+=` — ${x.due_date}`;
  return line;
}));
pushSection(`⚠️ ${t.risks}`,list(d.risks,x=>{
  if(!x?.title)return '';
  const lines=[`• ${x.title}`];
  const description=detailsLine(x);if(description)lines.push(`  ${description}`);
  if(text(x?.impact))lines.push(`  ${t.impact}: ${x.impact}`);
  if(text(x?.mitigation))lines.push(`  ${t.mitigation}: ${x.mitigation}`);
  return lines.join('\n');
}));

let architectureText='';
if(d.architecture&&Array.isArray(d.architecture.sections)){
  const parts=[];
  for(const section of d.architecture.sections){
    if(!section||!Array.isArray(section.items)||!section.items.length)continue;
    const mode=text(section.layout||section.mode).toLowerCase();
    const isProcess=['process','flow','pipeline','sequence','workflow'].includes(mode);
    let body='';
    if(isProcess){
      const arrow=['ar','fa'].includes(lang)?' ← ':' → ';
      body=section.items.map(item=>text(item?.title)).filter(Boolean).join(arrow);
      const descriptions=section.items.map(item=>{
        const title=text(item?.title),desc=text(item?.description);
        return title&&desc?`• ${title} — ${desc}`:'';
      }).filter(Boolean).join('\n');
      if(descriptions)body+=`\n${descriptions}`;
    }else{
      body=section.items.map(item=>{
        if(!item?.title)return '';
        return `• ${item.title}${item.description?` — ${item.description}`:''}`;
      }).filter(Boolean).join('\n');
    }
    if(body)parts.push(`${section.title?`${section.title}\n`:''}${body}`);
  }
  architectureText=parts.join('\n\n');
}
if(!architectureText&&Array.isArray(d.architecture)){
  architectureText=list(d.architecture,x=>x?.title?`• ${x.title}${x.description?` — ${x.description}`:''}`:'');
}
pushSection(`🏗 ${t.architecture}`,architectureText);
pushSection(`👤 ${t.owners}`,list(d.owners,x=>{
  if(!x?.name)return '';
  const responsibility=text(x.responsibility||x.role||x.title);
  return `• ${x.name}${responsibility?` — ${responsibility}`:''}`;
}));

let report=sections.join('\n\n').trim();
let compacted=false;
if(report.length>MAX_REPORT_CHARS){
  const suffix=`\n\n…\n${t.full_details}`;
  report=report.slice(0,Math.max(0,MAX_REPORT_CHARS-suffix.length)).trimEnd()+suffix;
  compacted=true;
}

return [{json:{...d,chat_id:d.chat_id,share_token:d.share_token,language:lang,meeting_language:lang,direction:['ar','fa'].includes(lang)?'rtl':'ltr',report,telegram_report_compacted:compacted,open_report_button:t.open_report,share_report_button:t.share_report}}];
