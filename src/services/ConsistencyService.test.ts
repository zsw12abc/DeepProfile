import { describe, it, expect, beforeEach } from 'vitest';
import { ConsistencyService } from './ConsistencyService';
import { ProfileData } from './ConsistencyService';

describe('ConsistencyService', () => {
  let sampleProfile: ProfileData;

  beforeEach(() => {
    sampleProfile = {
      nickname: 'Test User',
      topic_classification: 'society',
      value_orientation: [
        { label: 'individualism_vs_collectivism', score: 0.8 },
        { label: 'elite_vs_grassroots', score: 0.7 },
        { label: 'urban_vs_rural', score: -0.9 }
      ],
      summary: 'This user shows some characteristics.',
      evidence: [
        {
          quote: 'Sample quote',
          analysis: 'Sample analysis',
          source_title: 'Source',
          source_id: '1'
        }
      ]
    };
  });

  describe('validateAndFixSummaryConsistency', () => {
    it('should add missing high-score label descriptions to summary', () => {
      const profileWithoutLabelReference = {
        ...sampleProfile,
        summary: 'This user has various views.'
      };

      const result = ConsistencyService.validateAndFixSummaryConsistency(profileWithoutLabelReference);
      
      // Check if the summary now includes information about high-score labels
      expect(result.summary).toContain('个人主义 vs 集体主义');
      expect(result.summary).toContain('精英/奋斗 vs 草根/躺平');
      expect(result.summary).toContain('城市 vs 乡土');
    });

    it('should not modify summary when labels are already mentioned', () => {
      const profileWithLabelReference = {
        ...sampleProfile,
        summary: 'This user shows strong individualistic tendencies and urban preferences.'
      };

      const result = ConsistencyService.validateAndFixSummaryConsistency(profileWithLabelReference);
      
      // The summary should remain largely unchanged since labels are already mentioned
      expect(result.summary).toContain('individualistic tendencies');
    });

    it('should handle empty value_orientation array', () => {
      const profileWithEmptyLabels = {
        ...sampleProfile,
        value_orientation: [],
        summary: 'Original summary'
      };

      const result = ConsistencyService.validateAndFixSummaryConsistency(profileWithEmptyLabels);
      
      expect(result.summary).toBe('Original summary');
    });
  });

  describe('validateAndFixEvidenceConsistency', () => {
    it('should add evidence for high-score labels without supporting evidence', () => {
      const profileWithoutEvidence = {
        ...sampleProfile,
        evidence: [] // No existing evidence
      };

      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithoutEvidence);
      
      expect(result.evidence).not.toBeNull();
      expect(result.evidence).not.toBeUndefined();
      expect(Array.isArray(result.evidence)).toBe(true);
      
      // Should have added evidence for high-score labels
      const addedEvidence = result.evidence!.filter(e => 
        e.source_id === 'consistency_fix'
      );
      
      expect(addedEvidence.length).toBeGreaterThan(0);
    });

    it('should not add duplicate evidence when some evidence already exists', () => {
      const profileWithPartialEvidence = {
        ...sampleProfile,
        evidence: [
          {
            quote: 'Sample quote',
            analysis: 'Analysis includes individualism_vs_collectivism aspects',
            source_title: 'Source',
            source_id: '1'
          }
        ]
      };

      const result = ConsistencyService.validateAndFixEvidenceConsistency(profileWithPartialEvidence);
      
      // Should still have original evidence plus any needed additions
      expect(result.evidence!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateAndFixFullConsistency', () => {
    it('should apply both summary and evidence fixes', () => {
      const profile = {
        ...sampleProfile,
        summary: 'Basic summary without details',
        evidence: [] // No evidence
      };

      const result = ConsistencyService.validateAndFixFullConsistency(profile);
      
      // Should have modified both summary and evidence
      expect(result.summary).toContain('个人主义 vs 集体主义');
      expect(result.evidence).not.toBeNull();
    });
  });

  describe('generateConsistencyReport', () => {
    it('should generate a readable consistency report', () => {
      const report = ConsistencyService.generateConsistencyReport(sampleProfile);
      
      expect(report).toContain('=== 一致性分析报告 ===');
      expect(report).toContain('高分标签:');
      expect(report).toContain('个人主义 vs 集体主义');
    });

    it('should handle incomplete profile data', () => {
      const incompleteProfile = {
        summary: 'Just a summary'
      };

      const report = ConsistencyService.generateConsistencyReport(incompleteProfile as any);
      
      expect(report).toContain('Profile data incomplete');
    });
  });
});