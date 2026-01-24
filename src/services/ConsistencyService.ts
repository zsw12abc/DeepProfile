import { I18nService } from "./I18nService";
import { calculateFinalLabel, parseLabelName } from "./LabelUtils";
import { LabelService } from "./LabelService";

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
    const highScoreLabels = profile.value_orientation.filter(item => Math.abs(item.score) >= 0.7);
    
    if (highScoreLabels.length > 0) {
      let fixedSummary = profile.summary;
      
      // 检查每个高分标签是否在摘要中得到体现
      for (const labelItem of highScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;
        
        const { left, right } = parseLabelName(labelInfo.name);
        const score = labelItem.score;
        
        // 根据分数确定应该体现的方向
        const expectedDirection = score > 0 ? right : left;
        
        // 检查摘要中是否提及了对应方向
        if (!this.containsKeyword(fixedSummary, expectedDirection) && 
            !this.containsKeyword(fixedSummary, labelInfo.id) &&
            !this.containsKeyword(fixedSummary, labelInfo.name)) {
          // 不再添加解释性句子，因为这些信息会在其他地方显示
          // 保持摘要的自然性，仅当摘要完全没有体现价值倾向时才考虑添加
          // 目前我们只做检查，不修改摘要
        }
      }
      
      fixedProfile.summary = fixedSummary;
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
    const highScoreLabels = profile.value_orientation.filter(item => Math.abs(item.score) >= 0.7);
    
    if (highScoreLabels.length > 0) {
      const labelService = LabelService.getInstance();
      const existingEvidence = [...profile.evidence];
      
      for (const labelItem of highScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;
        
        // 检查是否已有支持该标签的证据
        const hasSupportingEvidence = existingEvidence.some(e =>
          this.containsKeyword(e.analysis, labelInfo.name) ||
          this.containsKeyword(e.analysis, labelInfo.id) ||
          this.containsKeyword(e.quote, labelInfo.name) ||
          this.containsKeyword(e.quote, labelInfo.id)
        );
        
        // 不再添加模板化证据，只是检查现有证据
        // 如果没有支持证据，保留原有证据不变
      }
    }
    
    // 对中等分数标签也执行相同检查，不添加模板化证据
    const mediumScoreLabels = profile.value_orientation.filter(item => 
      Math.abs(item.score) >= 0.4 && Math.abs(item.score) < 0.7
    );
    
    if (mediumScoreLabels.length > 0) {
      const labelService = LabelService.getInstance();
      
      for (const labelItem of mediumScoreLabels) {
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (!labelInfo) continue;
        
        // 检查是否已有支持该标签的证据
        const hasSupportingEvidence = profile.evidence.some(e =>
          this.containsKeyword(e.analysis, labelInfo.name) ||
          this.containsKeyword(e.analysis, labelInfo.id) ||
          this.containsKeyword(e.quote, labelInfo.name) ||
          this.containsKeyword(e.quote, labelInfo.id)
        );
        
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
   * 生成一致性报告（用于调试）
   */
  static generateConsistencyReport(profile: ProfileData): string {
    if (!profile.value_orientation || !profile.summary) {
      return "Profile data incomplete for consistency analysis.";
    }
    
    const reportParts: string[] = [];
    reportParts.push("=== 一致性分析报告 ===");
    
    // 分析高分标签
    const highScoreLabels = profile.value_orientation.filter(item => Math.abs(item.score) >= 0.7);
    if (highScoreLabels.length > 0) {
      reportParts.push("\n高分标签:");
      for (const labelItem of highScoreLabels) {
        const labelService = LabelService.getInstance();
        const labelInfo = labelService.getLabelById(labelItem.label);
        if (labelInfo) {
          const finalLabel = calculateFinalLabel(labelInfo.id, labelItem.score);
          const direction = labelItem.score > 0 ? "右" : "左";
          reportParts.push(`  - ${labelInfo.name}: ${labelItem.score.toFixed(2)} (${direction}侧-${finalLabel.label})`);
          
          // 检查摘要中是否提及
          const contains = this.containsKeyword(profile.summary, finalLabel.label) ||
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
          const hasSupportingEvidence = profile.evidence.some(e =>
            this.containsKeyword(e.analysis, labelInfo.name) ||
            this.containsKeyword(e.analysis, labelInfo.id) ||
            this.containsKeyword(e.quote, labelInfo.name) ||
            this.containsKeyword(e.quote, labelInfo.id)
          );
          reportParts.push(`  - ${labelInfo.name}: ${hasSupportingEvidence ? "有支持证据" : "缺乏支持证据"}`);
        }
      }
    }
    
    return reportParts.join('\n');
  }
}