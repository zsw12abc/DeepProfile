import { TopicService } from "./TopicService";
import { parseLabelName } from "./LabelUtils";
import type { MacroCategory, ProfileData } from "~types";
import { I18nService } from "./I18nService";

export class ExportService {
  /**
   * 将画像数据转换为 Markdown 格式
   */
  static toMarkdown(
    profile: ProfileData,
    category: MacroCategory,
    url: string,
    generatedAt: number,
  ): string {
    const categoryName = TopicService.getCategoryName(category);
    const isEn = I18nService.getLanguage() === "en-US";
    const genDate = new Date(generatedAt).toLocaleString(
      isEn ? "en-US" : "zh-CN",
    );
    const expDate = new Date().toLocaleString(isEn ? "en-US" : "zh-CN");

    let md = `# 👤 ${I18nService.t("app_name")} ${I18nService.t("topic_classification")} Report\n\n`;
    md += `> **${I18nService.t("topic_classification")}:** ${categoryName}\n`;
    md += `> **${I18nService.t("ai_summary")}:** ${profile.nickname || I18nService.t("history_empty")}\n`;
    md += `> **${I18nService.t("export_image")}:** ${genDate}\n`;
    md += `> **${I18nService.t("export_markdown")}:** ${expDate}\n`;
    md += `> **${I18nService.t("source")}:** [${I18nService.t("click_jump")}](${url})\n\n`;

    md += `## 📝 ${I18nService.t("ai_summary")}

${profile.summary}

`;

    md += `## 🧭 ${I18nService.t("value_orientation")}\n\n`;
    if (profile.value_orientation && profile.value_orientation.length > 0) {
      md += `| ${I18nService.t("topic_classification")} | ${I18nService.t("value_orientation")} | ${I18nService.t("export_markdown")} |\n`;
      md += `| :--- | :--- | :--- |\n`;

      profile.value_orientation.forEach((item) => {
        const parsedLabel = parseLabelName(item.label);
        const leftLabel = parsedLabel.left || "Left";
        const rightLabel = parsedLabel.right || "Right";
        const percentage = Math.abs(item.score) * 100;

        const bar = this.generateProgressBar(percentage, item.score);
        md += `| ${leftLabel} vs ${rightLabel} | ${bar} | ${Math.round(percentage)}% |\n`;
      });
      md += `\n`;
    } else {
      md += `*${I18nService.t("no_data")}*\n\n`;
    }

    if (profile.evidence && profile.evidence.length > 0) {
      md += `## 🔍 ${I18nService.t("evidence")}\n\n`;
      profile.evidence.forEach((ev, index) => {
        md += `### ${index + 1}. ${ev.analysis}\n`;
        md += `> "${ev.quote}"\n`;
        if (ev.source_title) {
          md += `> — ${I18nService.t("source")}: *${ev.source_title}*\n`;
        }
        md += `\n`;
      });
    }

    md += `---\n*${I18nService.t("generated_by")} DeepProfile Chrome Extension*`;

    return md;
  }

  private static generateProgressBar(
    percentage: number,
    score: number,
  ): string {
    // 10 blocks total, 5 for left, 5 for right
    // Center is between block 5 and 6

    const halfBlocks = 5;

    // Calculate how many blocks to fill from center
    // percentage is 0-100, so we map 0-100 to 0-5 blocks
    const fillBlocks = Math.round((percentage / 100) * halfBlocks);

    let bar = "";

    if (score < 0) {
      // Negative score: fill left side from center
      // Empty left blocks + Filled left blocks + Center + Empty right blocks
      const emptyLeft = halfBlocks - fillBlocks;
      bar =
        "⬜".repeat(emptyLeft) +
        "🟥".repeat(fillBlocks) +
        "|" +
        "⬜".repeat(halfBlocks);
    } else {
      // Positive score: fill right side from center
      // Empty left blocks + Center + Filled right blocks + Empty right blocks
      const emptyRight = halfBlocks - fillBlocks;
      bar =
        "⬜".repeat(halfBlocks) +
        "|" +
        "🟦".repeat(fillBlocks) +
        "⬜".repeat(emptyRight);
    }

    return bar;
  }
}
