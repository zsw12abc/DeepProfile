import { TopicService, type MacroCategory } from "./TopicService";
import { calculateFinalLabel } from "./LabelUtils";
import type { ProfileData } from "~types";
import { I18nService } from "./I18nService";

export class ExportService {
  
  /**
   * 将画像数据转换为 Markdown 格式
   */
  static toMarkdown(profile: ProfileData, category: MacroCategory, url: string, generatedAt: number): string {
    const categoryName = TopicService.getCategoryName(category);
    const isEn = I18nService.getLanguage() === 'en-US';
    const genDate = new Date(generatedAt).toLocaleString(isEn ? 'en-US' : 'zh-CN');
    const expDate = new Date().toLocaleString(isEn ? 'en-US' : 'zh-CN');
    
    let md = `# 👤 ${I18nService.t('app_name')} ${I18nService.t('topic_classification')} Report\n\n`;
    md += `> **${I18nService.t('topic_classification')}:** ${categoryName}\n`;
    md += `> **${I18nService.t('ai_summary')}:** ${profile.nickname || I18nService.t('history_empty')}\n`;
    md += `> **${I18nService.t('export_image')}:** ${genDate}\n`;
    md += `> **${I18nService.t('export_markdown')}:** ${expDate}\n`;
    md += `> **${I18nService.t('source')}:** [${I18nService.t('click_jump')}](${url})\n\n`;
    
    md += `## 📝 ${I18nService.t('ai_summary')}

${profile.summary}

`;
    
    md += `## 🧭 ${I18nService.t('value_orientation')}\n\n`;
    if (profile.value_orientation && profile.value_orientation.length > 0) {
      md += `| ${I18nService.t('topic_classification')} | ${I18nService.t('value_orientation')} | ${I18nService.t('export_markdown')} |\n`;
      md += `| :--- | :--- | :--- |\n`;
      
      profile.value_orientation.forEach(item => {
        const { label, percentage } = calculateFinalLabel(item.label, item.score);
        const bar = this.generateProgressBar(percentage, item.score);
        md += `| ${label} | ${bar} | ${percentage}% |\n`;
      });
      md += `\n`;
    } else {
      md += `*${I18nService.t('no_data')}*\n\n`;
    }
    
    if (profile.evidence && profile.evidence.length > 0) {
      md += `## 🔍 ${I18nService.t('evidence')}\n\n`;
      profile.evidence.forEach((ev, index) => {
        md += `### ${index + 1}. ${ev.analysis}\n`;
        md += `> "${ev.quote}"\n`;
        if (ev.source_title) {
          md += `> — ${I18nService.t('source')}: *${ev.source_title}*\n`;
        }
        md += `\n`;
      });
    }
    
    md += `---\n*${I18nService.t('generated_by')} DeepProfile Chrome Extension*`;
    
    return md;
  }

  private static generateProgressBar(percentage: number, score: number): string {
    const blocks = Math.round(percentage / 10);
    const filled = score > 0 ? '🟦' : '🟥';
    return filled.repeat(blocks) + '⬜'.repeat(10 - blocks);
  }
}