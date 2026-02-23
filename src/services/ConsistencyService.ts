import { I18nService } from "./I18nService";
import { calculateFinalLabel, parseLabelName } from "./LabelUtils";
import { LabelService } from "./LabelService";
import type { AnalysisMode } from "~types";

export interface ProfileData {
  nickname?: string;
  topic_classification?: string;
  value_orientation?: Array<{ label: string; score: number }>;
  summary?: string;
  reasoning?: string;
  evidence?: Array<{
    quote: string;
    analysis: string;
    source_title: string;
    source_id?: string;
  }>;
}

/**
 * 一致性服务，确保AI生成的摘要与标签分数保持一致
 */
export class ConsistencyService {
  /**
   * 验证并修复AI生成的摘要与标签分数的一致性
   */
  static validateAndFixSummaryConsistency(profile: ProfileData): ProfileData {
    if (!profile.value_orientation || !profile.summary) {
      return profile;
    }

    const fixedProfile = { ...profile };

    // 获取标签服务实例以获取标签详情
    const labelService = LabelService.getInstance();

    // 检查高分标签是否在摘要中得到体现
    const highScoreLabels = profile.value_orientation.filter(
      (item) => Math.abs(item.score) >= 0.7,
    );

    if (highScoreLabels.length > 0) {
      const summary = profile.summary;

      // 检查每个高分标签是否在摘要中得到体现
      for (const labelItem of highScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;

        const { left, right } = parseLabelName(labelInfo.name);
        const score = labelItem.score;

        // 根据分数确定应该体现的方向
        const expectedDirection = score > 0 ? right : left;

        // 检查摘要中是否提及了对应方向
        if (
          !this.containsKeyword(summary, expectedDirection) &&
          !this.containsKeyword(summary, labelInfo.id) &&
          !this.containsKeyword(summary, labelInfo.name)
        ) {
          // 不再添加解释性句子，因为这些信息会在其他地方显示
          // 保持摘要的自然性，仅当摘要完全没有体现价值倾向时才考虑添加
          // 目前我们只做检查，不修改摘要
        }
      }
    }

    return fixedProfile;
  }

  /**
   * 验证证据与标签分数的一致性
   * 注意：不再添加模板化证据，因为这可能误导用户以为这些是真实引述
   */
  static validateAndFixEvidenceConsistency(profile: ProfileData): ProfileData {
    if (!profile.value_orientation || !profile.evidence) {
      return profile;
    }

    const fixedProfile = { ...profile };

    // 仅检查现有证据与标签的一致性，不再添加模板化证据
    const highScoreLabels = profile.value_orientation.filter(
      (item) => Math.abs(item.score) >= 0.7,
    );

    if (highScoreLabels.length > 0) {
      const labelService = LabelService.getInstance();

      for (const labelItem of highScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;

        // 检查是否已有支持该标签的证据
        // 不再添加模板化证据，只是检查现有证据
        // 如果没有支持证据，保留原有证据不变
      }
    }

    // 对中等分数标签也执行相同检查，不添加模板化证据
    const mediumScoreLabels = profile.value_orientation.filter(
      (item) => Math.abs(item.score) >= 0.4 && Math.abs(item.score) < 0.7,
    );

    if (mediumScoreLabels.length > 0) {
      const labelService = LabelService.getInstance();

      for (const labelItem of mediumScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;

        // 检查是否已有支持该标签的证据
        // 同样，不添加模板化证据
      }
    }

    // 保持原有的证据不变，不添加任何模板化内容
    return fixedProfile;
  }

  /**
   * 检查文本是否包含指定关键词
   */
  private static containsKeyword(text: string, keyword: string): boolean {
    if (!text || !keyword) return false;

    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    // 简单的关键词匹配，可扩展为更复杂的匹配逻辑
    return lowerText.includes(lowerKeyword);
  }

  /**
   * 完整的一致性验证和修复流程
   */
  static validateAndFixFullConsistency(profile: ProfileData): ProfileData {
    let fixedProfile = { ...profile };

    // 首先修复摘要一致性（目前仅检查，不修改）
    fixedProfile = this.validateAndFixSummaryConsistency(fixedProfile);

    // 然后修复证据一致性
    fixedProfile = this.validateAndFixEvidenceConsistency(fixedProfile);

    return fixedProfile;
  }

  /**
   * Enforce summary alignment with top label directions, mode-aware.
   * This adds short, non-numeric phrases only when summary lacks key label directions.
   */
  static enforceSummaryAlignment(
    profile: ProfileData,
    mode: AnalysisMode,
  ): ProfileData {
    if (
      !profile.summary ||
      !profile.value_orientation ||
      profile.value_orientation.length === 0
    ) {
      return profile;
    }

    if (mode === "fast") {
      return profile;
    }

    const maxLabels = mode === "deep" ? 3 : 2;
    const threshold = mode === "deep" ? 0.3 : 0.3;
    const isEn = I18nService.getLanguage() === "en-US";

    const sorted = [...profile.value_orientation]
      .filter((item) => Math.abs(item.score) >= threshold)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, maxLabels);

    if (sorted.length === 0) {
      return profile;
    }

    let summary = profile.summary;
    const labelService = LabelService.getInstance();
    const additions: string[] = [];

    for (const labelItem of sorted) {
      const labelInfo = labelService.getLabelById(labelItem.label);
      if (!labelInfo) continue;

      const finalLabel = calculateFinalLabel(
        labelInfo.id,
        labelItem.score,
      ).label;
      if (!finalLabel) continue;

      const hasKeyword =
        this.containsKeyword(summary, finalLabel) ||
        this.containsKeyword(summary, labelInfo.name) ||
        this.containsKeyword(summary, labelInfo.id);

      if (hasKeyword) continue;

      const intensity = this.getIntensityWord(labelItem.score, isEn);
      additions.push(
        isEn ? `${intensity} ${finalLabel}` : `${intensity}${finalLabel}`,
      );
    }

    if (additions.length === 0) {
      return profile;
    }

    const separator = isEn ? " " : "";
    const clause = isEn
      ? `Overall, the user is ${additions.join(" and ")}.`
      : `整体上更偏向${additions.join("、")}。`;

    if (
      !summary.endsWith("。") &&
      !summary.endsWith(".") &&
      !summary.endsWith("!") &&
      !summary.endsWith("！")
    ) {
      summary += isEn ? ". " : "。";
    } else {
      summary += separator;
    }

    summary += clause;

    return { ...profile, summary };
  }

  private static getIntensityWord(score: number, isEn: boolean): string {
    const abs = Math.abs(score);
    if (isEn) {
      if (abs >= 0.7) return "strongly";
      if (abs >= 0.5) return "clearly";
      if (abs >= 0.3) return "slightly";
      return "somewhat";
    }

    if (abs >= 0.7) return "明显";
    if (abs >= 0.5) return "较为";
    if (abs >= 0.3) return "略偏";
    return "稍微";
  }

  static normalizeScores(
    profile: ProfileData,
    labelIds: string[],
  ): ProfileData {
    if (!profile.value_orientation || profile.value_orientation.length === 0) {
      return profile;
    }

    const scoreMap = new Map<string, number>();
    profile.value_orientation.forEach((item) => {
      const normalized = Math.max(-1, Math.min(1, item.score));
      if (!scoreMap.has(item.label)) {
        scoreMap.set(item.label, normalized);
      } else {
        const existing = scoreMap.get(item.label)!;
        if (Math.abs(normalized) > Math.abs(existing)) {
          scoreMap.set(item.label, normalized);
        }
      }
    });

    const fixed = labelIds.map((labelId) => ({
      label: labelId,
      score: scoreMap.get(labelId) ?? 0,
    }));

    return { ...profile, value_orientation: fixed };
  }

  static adjustScoresByEvidence(
    profile: ProfileData,
    labelIds: string[],
  ): ProfileData {
    void labelIds;

    if (
      !profile.value_orientation ||
      profile.value_orientation.length === 0 ||
      !profile.evidence
    ) {
      return profile;
    }

    const labelService = LabelService.getInstance();
    const evidenceText = profile.evidence
      .map((e) => `${e.quote} ${e.analysis}`)
      .join(" ");
    const updated = profile.value_orientation.map((item) => {
      const labelInfo = labelService.getLabelById(item.label);
      if (!labelInfo) return item;

      const finalLabel = calculateFinalLabel(labelInfo.id, item.score).label;
      const hasSupport =
        this.containsKeyword(evidenceText, labelInfo.name) ||
        this.containsKeyword(evidenceText, labelInfo.id) ||
        (finalLabel && this.containsKeyword(evidenceText, finalLabel));

      const abs = Math.abs(item.score);
      if (abs >= 0.7 && !hasSupport) {
        return { ...item, score: item.score * 0.6 };
      }
      if (abs >= 0.4 && !hasSupport) {
        return { ...item, score: item.score * 0.8 };
      }
      return item;
    });

    return { ...profile, value_orientation: updated };
  }

  static detectSummaryConflicts(
    profile: ProfileData,
  ): { label: string; conflict: boolean }[] {
    if (!profile.value_orientation || !profile.summary) {
      return [];
    }

    const labelService = LabelService.getInstance();
    const summary = profile.summary;
    return profile.value_orientation.map((item) => {
      const labelInfo = labelService.getLabelById(item.label);
      if (!labelInfo) return { label: item.label, conflict: false };

      const parsed = parseLabelName(labelInfo.name);
      const expected = item.score >= 0 ? parsed.right : parsed.left;
      const opposite = item.score >= 0 ? parsed.left : parsed.right;

      const hasExpected = expected && this.containsKeyword(summary, expected);
      const hasOpposite = opposite && this.containsKeyword(summary, opposite);

      return {
        label: item.label,
        conflict: Boolean(hasOpposite && !hasExpected),
      };
    });
  }

  static resolveSummaryConflicts(profile: ProfileData): ProfileData {
    if (!profile.summary || !profile.value_orientation) {
      return profile;
    }

    const conflicts = this.detectSummaryConflicts(profile);
    const hasConflict = conflicts.some((c) => c.conflict);
    if (!hasConflict) return profile;

    const isEn = I18nService.getLanguage() === "en-US";
    let summary = profile.summary;
    const labelService = LabelService.getInstance();

    for (const conflict of conflicts) {
      if (!conflict.conflict) continue;
      const labelInfo = labelService.getLabelById(conflict.label);
      if (!labelInfo) continue;
      const parsed = parseLabelName(labelInfo.name);
      const opposite =
        profile.value_orientation?.find((item) => item.label === conflict.label)
          ?.score ?? 0;
      const oppositeKeyword = opposite >= 0 ? parsed.left : parsed.right;
      if (oppositeKeyword) {
        const escaped = oppositeKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        summary = summary.replace(new RegExp(escaped, "gi"), "");
      }
    }

    const prefix = isEn ? "Summary alignment notice: " : "摘要一致性提示：";
    summary = `${prefix}${summary.trim()}`;

    return { ...profile, summary };
  }

  /**
   * 生成一致性报告（用于调试）
   */
  static generateConsistencyReport(profile: ProfileData): string {
    if (!profile.value_orientation || !profile.summary) {
      return "Profile data incomplete for consistency analysis.";
    }

    const reportParts: string[] = [];
    reportParts.push("=== 一致性分析报告 ===");

    // 分析高分标签
    const highScoreLabels = profile.value_orientation.filter(
      (item) => Math.abs(item.score) >= 0.7,
    );
    if (highScoreLabels.length > 0) {
      reportParts.push("\n高分标签:");
      for (const labelItem of highScoreLabels) {
        const labelService = LabelService.getInstance();
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (labelInfo) {
          const finalLabel = calculateFinalLabel(labelInfo.id, labelItem.score);
          const direction = labelItem.score > 0 ? "右" : "左";
          reportParts.push(
            `  - ${labelInfo.name}: ${labelItem.score.toFixed(2)} (${direction}侧-${finalLabel.label})`,
          );

          // 检查摘要中是否提及
          const contains =
            this.containsKeyword(profile.summary, finalLabel.label) ||
            this.containsKeyword(profile.summary, labelInfo.name) ||
            this.containsKeyword(profile.summary, labelInfo.id);
          reportParts.push(`    * 摘要中提及: ${contains ? "是" : "否"}`);
        }
      }
    }

    // 分析证据支持情况
    if (profile.evidence) {
      reportParts.push("\n证据支持情况:");
      for (const labelItem of highScoreLabels) {
        const labelService = LabelService.getInstance();
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (labelInfo) {
          const hasSupportingEvidence = profile.evidence.some(
            (e) =>
              this.containsKeyword(e.analysis, labelInfo.name) ||
              this.containsKeyword(e.analysis, labelInfo.id) ||
              this.containsKeyword(e.quote, labelInfo.name) ||
              this.containsKeyword(e.quote, labelInfo.id),
          );
          reportParts.push(
            `  - ${labelInfo.name}: ${hasSupportingEvidence ? "有支持证据" : "缺乏支持证据"}`,
          );
        }
      }
    }

    return reportParts.join("\n");
  }
}
