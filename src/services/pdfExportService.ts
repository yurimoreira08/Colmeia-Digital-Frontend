import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { OPTION_LABELS as REVISION_OPTION_LABELS } from '../types/reviewReport';
import { isoDateToDisplay } from '../utils/date';

const MANEJO_OPTION_LABELS: Record<string, string> = {
  alimentacao: 'Alimentação',
  divisao: 'Divisão',
  'troca-cera': 'Troca de cera',
  'troca-rainha': 'Troca de rainha',
  'colocacao-sobrecaixa': 'Colocação de sobrecaixa',
  captura: 'Captura',
  'defesa-predadores': 'Defesa contra predadores',
  'reducao-alvado': 'Redução de alvado',
  'numerar-caixas': 'Numerar caixas',
  'ofertar-agua': 'Ofertar água',
  'recolher-caixas-vazias': 'Recolher caixas vazias ou abandonadas',
  'trocar-caixa': 'Trocar caixa',
  outro: 'Outro',
};

export type TimeFilterPeriod = '7days' | '30days' | 'thisMonth' | '3months' | 'all';

export function calculateDateRange(period: TimeFilterPeriod): { fromDate?: string; toDate?: string; label: string } {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);

  if (period === '7days') {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate,
      label: 'Últimos 7 dias',
    };
  }

  if (period === '30days') {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate,
      label: 'Últimos 30 dias',
    };
  }

  if (period === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate,
      label: 'Mês Atual',
    };
  }

  if (period === '3months') {
    const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate,
      label: 'Últimos 3 meses',
    };
  }

  return {
    label: 'Todo o Histórico',
  };
}

/**
 * Normaliza qualquer item de relatório (Revisão ou Manejo),
 * suportando nomes em snake_case ou camelCase e garantindo parsing de JSON.
 */
export function normalizeReportItem(rawItem: any) {
  if (!rawItem) return rawItem;

  let checked = rawItem.checkedOptions ?? rawItem.checked_options;
  if (typeof checked === 'string') {
    try {
      checked = JSON.parse(checked);
    } catch {
      checked = [];
    }
  }
  if (!Array.isArray(checked)) {
    checked = [];
  }

  const normalizedChecked = checked.map((c: any) => {
    if (typeof c === 'object' && c !== null) {
      return {
        id: c.id || c.name || '',
        obs: c.obs || c.observacao || '',
        ind: c.ind || c.indicacao || '',
        customName: c.customName || c.custom_name || '',
      };
    }
    return c;
  });

  return {
    ...rawItem,
    id: rawItem.id,
    caixaId: rawItem.caixaId ?? rawItem.caixa_id,
    caixaName: rawItem.caixaName || rawItem.caixa_name || 'Caixa',
    apiaryId: rawItem.apiaryId ?? rawItem.apiary_id,
    apiaryName: rawItem.apiaryName || rawItem.apiary_name || 'Apiário',
    tipo: rawItem.tipo,
    checkedOptions: normalizedChecked,
    observacoes: rawItem.observacoes || rawItem.observacao || rawItem.obs || '',
    indicacoes: rawItem.indicacoes || rawItem.indicacao || rawItem.ind || '',
    photoUri: rawItem.photoUri || rawItem.photo_uri || undefined,
    createdAt: rawItem.createdAt || rawItem.created_at || '',
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--/--/----';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return isoDateToDisplay(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${mins}`;
  } catch {
    return dateStr;
  }
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converte URI local de imagem em Data URI base64 para renderização 100% segura no PDF gerado.
 */
async function resolvePhotoForPdf(uri?: string): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn('[pdfExportService] Erro ao carregar foto local em base64:', err);
    return uri;
  }
}

const BASE_PDF_CSS = `
  <style>
    @page {
      margin: 14mm 14mm 18mm 14mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      color: #1E293B;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #2C4251 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 22px 24px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-info h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      letter-spacing: 0.5px;
      color: #FFFFFF;
    }
    .header-info p {
      margin: 0;
      font-size: 13px;
      color: #9FD1D4;
      font-weight: 600;
    }
    .header-badge {
      text-align: right;
      font-size: 11px;
      color: #BACEE1;
    }
    .header-badge strong {
      display: block;
      font-size: 14px;
      color: #FFFFFF;
      margin-top: 2px;
    }
    .meta-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #2C4251;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-val {
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #2C4251;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 8px;
      margin-top: 20px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .activity-card {
      background-color: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #F1F5F9;
    }
    .box-badge {
      display: inline-flex;
      align-items: center;
      font-size: 14px;
      font-weight: 800;
      color: #2C4251;
    }
    .type-pill {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .type-pill-revisao {
      background-color: #E0F2FE;
      color: #0369A1;
      border: 1px solid #BAE6FD;
    }
    .type-pill-manejo {
      background-color: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }
    .block-heading {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-top: 8px;
      margin-bottom: 6px;
    }
    .tag-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
      margin-bottom: 10px;
    }
    .tag {
      background-color: #F0FDF4;
      color: #166534;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #BBF7D0;
    }
    .task-item {
      background-color: #F8FAFC;
      border-left: 3px solid #6DA6B4;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .task-title {
      font-weight: 800;
      color: #2C4251;
      font-size: 13px;
    }
    .task-detail {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.4;
    }
    .task-detail strong {
      color: #1E293B;
    }
    .callout {
      background-color: #F8FAFC;
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 8px;
      border: 1px solid #E2E8F0;
    }
    .callout-obs {
      border-left: 3px solid #7798AB;
    }
    .callout-ind {
      border-left: 3px solid #0284C7;
      background-color: #F0F9FF;
    }
    .callout-label {
      font-size: 11px;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.3px;
    }
    .callout-text {
      font-size: 13px;
      color: #1E293B;
      margin: 0;
      white-space: pre-wrap;
    }
    .photo-section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      page-break-inside: avoid;
    }
    .report-photo {
      max-width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #CBD5E1;
      margin-top: 6px;
      display: block;
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #CBD5E1;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748B;
    }
    .footer-brand {
      font-weight: 800;
      letter-spacing: 1px;
      color: #2C4251;
    }
  </style>
`;

/**
 * Gera e abre o diálogo de download/compartilhamento de um relatório individual completo.
 * Exibe TODAS as anotações preenchidas: condições, tarefas com observações e o que fazer,
 * observações gerais, recomendações técnicas e foto do manejo.
 */
export async function exportSingleReportPdf(rawItem: any, type: 'revisao' | 'manejo'): Promise<void> {
  try {
    const item = normalizeReportItem(rawItem);
    const isRevisao = type === 'revisao';
    const title = isRevisao ? 'Relatório de Revisão Biológica' : 'Relatório de Manejo Técnico';
    const dateFormatted = formatDate(item.createdAt);
    const apiaryName = escapeHtml(item.apiaryName || 'Apiário Geral');
    const boxName = escapeHtml(item.caixaName || 'Caixa');

    let contentHtml = '';

    if (isRevisao) {
      const options = item.checkedOptions || [];
      const tagsHtml = options
        .map((opt: any) => {
          const key = typeof opt === 'object' && opt !== null ? opt.id || opt.name : opt;
          const label = REVISION_OPTION_LABELS[key] || key;
          return `<span class="tag">✔ ${escapeHtml(label)}</span>`;
        })
        .join('');

      contentHtml += `
        <div style="margin-bottom: 14px;">
          <div class="block-heading">Condições Biológicas Identificadas</div>
          ${tagsHtml ? `<div class="tag-container">${tagsHtml}</div>` : '<p style="font-size: 12px; color: #64748B; font-style: italic;">Nenhuma condição marcada.</p>'}
        </div>
      `;
    } else {
      const tasks = item.checkedOptions || [];
      const tasksHtml = tasks
        .map((t: any) => {
          const taskTitle = t.id === 'outro' && t.customName ? t.customName : MANEJO_OPTION_LABELS[t.id] || t.customName || t.id;
          return `
            <div class="task-item">
              <div class="task-title">🔧 ${escapeHtml(taskTitle)}</div>
              ${t.obs ? `<div class="task-detail"><strong>Observação da Tarefa:</strong> ${escapeHtml(t.obs)}</div>` : ''}
              ${t.ind ? `<div class="task-detail" style="color: #0369A1;"><strong>O que fazer:</strong> ${escapeHtml(t.ind)}</div>` : ''}
            </div>
          `;
        })
        .join('');

      contentHtml += `
        <div style="margin-bottom: 14px;">
          <div class="block-heading">Tarefas Realizadas no Manejo</div>
          ${tasksHtml || '<p style="font-size: 12px; color: #64748B; font-style: italic;">Nenhuma tarefa detalhada.</p>'}
        </div>
      `;
    }

    // Observações Gerais
    if (item.observacoes && item.observacoes.trim()) {
      contentHtml += `
        <div class="callout callout-obs" style="margin-bottom: 10px;">
          <div class="callout-label">Observações Gerais</div>
          <p class="callout-text">${escapeHtml(item.observacoes)}</p>
        </div>
      `;
    }

    // Recomendações e Próximos Passos
    if (item.indicacoes && item.indicacoes.trim()) {
      contentHtml += `
        <div class="callout callout-ind">
          <div class="callout-label" style="color: #0284C7;">Recomendações e Próximos Passos</div>
          <p class="callout-text">${escapeHtml(item.indicacoes)}</p>
        </div>
      `;
    }

    // Foto do Manejo / Revisão
    if (item.photoUri) {
      const photoSrc = await resolvePhotoForPdf(item.photoUri);
      if (photoSrc) {
        contentHtml += `
          <div class="photo-section">
            <div class="block-heading">Registro Fotográfico Anexado</div>
            <img src="${photoSrc}" class="report-photo" alt="Foto do Manejo" />
          </div>
        `;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          ${BASE_PDF_CSS}
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <h1>COLMEIA DIGITAL</h1>
              <p>${title}</p>
            </div>
            <div class="header-badge">
              DOCUMENTO OFICIAL
              <strong>${isRevisao ? 'REVISÃO' : 'MANEJO'}</strong>
            </div>
          </div>

          <div class="meta-card">
            <div class="meta-item">
              <span class="meta-label">Apiário</span>
              <span class="meta-val">${apiaryName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Caixa</span>
              <span class="meta-val">${boxName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Data e Hora</span>
              <span class="meta-val">${dateFormatted}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Código de Registro</span>
              <span class="meta-val">#${item.id || 'N/A'}</span>
            </div>
          </div>

          <div class="activity-card">
            ${contentHtml}
          </div>

          <div class="footer">
            <span class="footer-brand">FROM BOILES • COLMEIA DIGITAL v2.0</span>
            <span>Emitido em: ${formatDate(new Date().toISOString())}</span>
          </div>
        </body>
      </html>
    `;

    const cleanBox = boxName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Relatorio_${isRevisao ? 'Revisao' : 'Manejo'}_${cleanBox}_${item.id || '0'}.pdf`;
    await printAndShare(html, fileName);
  } catch (err: any) {
    console.error('[pdfExportService] Erro ao exportar relatório individual:', err);
    Alert.alert('Erro ao gerar PDF', err?.message || 'Não foi possível gerar o arquivo PDF.');
  }
}

export type GroupExportOptions = {
  title: string;
  apiaryName?: string;
  apiaryLocation?: string;
  boxName?: string;
  periodLabel: string;
  revisoes: any[];
  manejos: any[];
};

/**
 * Gera e abre o download de um relatório consolidado com todas as atividades de um apiário ou caixa.
 * Inclui todas as anotações, tarefas, fotos, observações e recomendações.
 */
export async function exportGroupReportsPdf(options: GroupExportOptions): Promise<void> {
  try {
    const {
      title,
      apiaryName,
      apiaryLocation,
      boxName,
      periodLabel,
      revisoes = [],
      manejos = [],
    } = options;

    const normalizedRevisoes = revisoes.map((r) => normalizeReportItem(r));
    const normalizedManejos = manejos.map((m) => normalizeReportItem(m));

    const totalRecords = normalizedRevisoes.length + normalizedManejos.length;
    if (totalRecords === 0) {
      Alert.alert('Sem registros', 'Nenhum relatório encontrado para o período e filtros selecionados.');
      return;
    }

    // Combina e ordena todas as atividades cronologicamente (mais recente primeiro)
    const combined: Array<{ item: any; type: 'revisao' | 'manejo' }> = [
      ...normalizedRevisoes.map((r) => ({ item: r, type: 'revisao' as const })),
      ...normalizedManejos.map((m) => ({ item: m, type: 'manejo' as const })),
    ].sort((a, b) => {
      const dateA = a.item.createdAt || '';
      const dateB = b.item.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    // Renderiza cada card de atividade resolvendo fotos assincronamente
    const activitiesHtmlList = await Promise.all(
      combined.map(async ({ item, type }) => {
        const isRevisao = type === 'revisao';
        const dateFormatted = formatDate(item.createdAt);
        const curBox = escapeHtml(item.caixaName || 'Caixa');
        const curApiary = escapeHtml(item.apiaryName || apiaryName || 'Apiário');

        let detailsHtml = '';

        if (isRevisao) {
          const optionsList = item.checkedOptions || [];
          const tagsHtml = optionsList
            .map((opt: any) => {
              const key = typeof opt === 'object' && opt !== null ? opt.id || opt.name : opt;
              const label = REVISION_OPTION_LABELS[key] || key;
              return `<span class="tag">✔ ${escapeHtml(label)}</span>`;
            })
            .join('');

          if (tagsHtml) {
            detailsHtml += `
              <div class="block-heading">Condições Biológicas Identificadas</div>
              <div class="tag-container">${tagsHtml}</div>
            `;
          }
        } else {
          const tasks = item.checkedOptions || [];
          const tasksHtml = tasks
            .map((t: any) => {
              const taskTitle = t.id === 'outro' && t.customName ? t.customName : MANEJO_OPTION_LABELS[t.id] || t.customName || t.id;
              return `
                <div class="task-item">
                  <div class="task-title">🔧 ${escapeHtml(taskTitle)}</div>
                  ${t.obs ? `<div class="task-detail"><strong>Observação da Tarefa:</strong> ${escapeHtml(t.obs)}</div>` : ''}
                  ${t.ind ? `<div class="task-detail" style="color: #0369A1;"><strong>O que fazer:</strong> ${escapeHtml(t.ind)}</div>` : ''}
                </div>
              `;
            })
            .join('');

          if (tasksHtml) {
            detailsHtml += `
              <div class="block-heading">Tarefas do Manejo</div>
              ${tasksHtml}
            `;
          }
        }

        // Observações Gerais
        if (item.observacoes && item.observacoes.trim()) {
          detailsHtml += `
            <div class="callout callout-obs">
              <div class="callout-label">Observações Gerais</div>
              <p class="callout-text">${escapeHtml(item.observacoes)}</p>
            </div>
          `;
        }

        // Recomendações e Próximos Passos
        if (item.indicacoes && item.indicacoes.trim()) {
          detailsHtml += `
            <div class="callout callout-ind">
              <div class="callout-label" style="color: #0284C7;">Recomendações e Próximos Passos</div>
              <p class="callout-text">${escapeHtml(item.indicacoes)}</p>
            </div>
          `;
        }

        // Foto da Atividade
        if (item.photoUri) {
          const photoSrc = await resolvePhotoForPdf(item.photoUri);
          if (photoSrc) {
            detailsHtml += `
              <div class="photo-section">
                <div class="block-heading">Registro Fotográfico</div>
                <img src="${photoSrc}" class="report-photo" alt="Foto da Atividade" />
              </div>
            `;
          }
        }

        return `
          <div class="activity-card">
            <div class="activity-header">
              <div>
                <span class="box-badge">📦 ${curBox}</span>
                <span style="font-size: 11px; color: #64748B; margin-left: 8px;">(${curApiary})</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: #64748B;">${dateFormatted}</span>
                <span class="type-pill ${isRevisao ? 'type-pill-revisao' : 'type-pill-manejo'}">
                  ${isRevisao ? 'Revisão' : 'Manejo'}
                </span>
              </div>
            </div>
            ${detailsHtml || '<p style="font-size: 12px; color: #64748B; font-style: italic;">Sem observações adicionais.</p>'}
          </div>
        `;
      })
    );

    const activitiesHtml = activitiesHtmlList.join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          ${BASE_PDF_CSS}
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <h1>COLMEIA DIGITAL</h1>
              <p>${escapeHtml(title)}</p>
            </div>
            <div class="header-badge">
              RELATÓRIO CONSOLIDADO
              <strong>${totalRecords} REGISTRO${totalRecords > 1 ? 'S' : ''}</strong>
            </div>
          </div>

          <div class="meta-card">
            ${apiaryName ? `
              <div class="meta-item">
                <span class="meta-label">Apiário</span>
                <span class="meta-val">${escapeHtml(apiaryName)}</span>
              </div>
            ` : ''}
            ${apiaryLocation ? `
              <div class="meta-item">
                <span class="meta-label">Localização</span>
                <span class="meta-val">${escapeHtml(apiaryLocation)}</span>
              </div>
            ` : ''}
            ${boxName ? `
              <div class="meta-item">
                <span class="meta-label">Caixa Específica</span>
                <span class="meta-val">${escapeHtml(boxName)}</span>
              </div>
            ` : ''}
            <div class="meta-item">
              <span class="meta-label">Filtro de Período</span>
              <span class="meta-val">${escapeHtml(periodLabel)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Resumo de Atividades</span>
              <span class="meta-val">${normalizedRevisoes.length} Revisões • ${normalizedManejos.length} Manejos</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Data de Emissão</span>
              <span class="meta-val">${formatDate(new Date().toISOString())}</span>
            </div>
          </div>

          <div class="section-title">
            <span>Histórico de Atividades Técnicas</span>
            <span style="font-size: 13px; font-weight: 600; color: #64748B;">Total: ${totalRecords}</span>
          </div>

          ${activitiesHtml}

          <div class="footer">
            <span class="footer-brand">FROM BOILES • COLMEIA DIGITAL v2.0</span>
            <span>Sistema Inteligente de Gestão Apícola</span>
          </div>
        </body>
      </html>
    `;

    const cleanTitle = (apiaryName || boxName || 'Consolidado').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Relatorio_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
    await printAndShare(html, fileName);
  } catch (err: any) {
    console.error('[pdfExportService] Erro ao exportar relatório em grupo:', err);
    Alert.alert('Erro ao gerar PDF', err?.message || 'Não foi possível gerar o arquivo PDF.');
  }
}

async function printAndShare(html: string, fileName: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: fileName,
    });
  } else {
    Alert.alert('PDF Gerado com Sucesso', `Arquivo salvo em: ${uri}`);
  }
}
