import { LabelService } from "./LabelService";
import { TopicService } from "./TopicService";
import { I18nService } from "./I18nService";
import { StructuredOutputService } from "./StructuredOutputService";
import { ExampleService } from "./ExampleService";
import type { AnalysisMode, MacroCategory } from "~types";

export const getParserInstructions = (mode: AnalysisMode): string =>
  StructuredOutputService.getFormatInstructions(mode);

export const buildSystemPrompt = (
  mode: AnalysisMode,
  category: MacroCategory,
  inputText?: string,
): string => {
  const labelService = LabelService.getInstance();
  labelService.refreshCategories();

  const standardLabels = labelService.getLabelsForContext(category, mode);
  const categoryName = TopicService.getCategoryName(category);
  const isEn = I18nService.getLanguage() === "en-US";

  const formatInstructions = getParserInstructions(mode);

  const exampleService = ExampleService.getInstance();
  const exampleCount = mode === "fast" ? 0 : mode === "balanced" ? 1 : 2;
  const dynamicExamples =
    inputText && exampleCount > 0
      ? exampleService.getRelevantExamples(
          inputText,
          category,
          mode,
          exampleCount,
        )
      : [];
  const dynamicFewShotExamples =
    dynamicExamples.length > 0
      ? exampleService.formatExamplesAsPrompt(dynamicExamples, mode)
      : isEn
        ? `
【Few-Shot Examples】
Text: "The government should stop regulating the market so much. Let businesses compete freely, and the economy will grow."
Analysis:
- market_vs_gov: 0.8 (Strongly favors market freedom over government intervention)
- competition_vs_equality: 0.6 (Favors competition)

Text: "We need to protect our traditional values. All these new woke ideas are destroying our family structure."
Analysis:
- change: -0.9 (Strongly conservative/traditional)
- feminism_vs_patriarchy: -0.5 (Likely favors traditional family roles)
`
        : `
【Few-Shot Examples】
文本: "政府管得太多了，应该让市场自由竞争，经济才能好起来。"
分析:
- market_vs_gov: 0.8 (强烈倾向于市场自由，反对政府干预)
- competition_vs_equality: 0.6 (倾向于竞争)

文本: "现在的年轻人太不像话了，我们需要回归传统价值观，保护我们的家庭结构。"
分析:
- change: -0.9 (强烈保守/传统)
- feminism_vs_patriarchy: -0.5 (倾向于传统家庭角色)
`;

  if (mode === "fast") {
    return `You are a sociology researcher conducting an academic study on internet subcultures and public values. Please objectively analyze the author's value orientation based on the provided text materials.

${formatInstructions}

【Instructions】
1. Current Research Field: 【${categoryName}】. If the content is completely unrelated to this field, please state so in the summary and return an empty value_orientation.
2. Please use academic and neutral language for description.
3. Please select the most matching labels from the Standard Label Library below based on the content.
4. Must use the 【Label ID】 defined in the library (e.g., 'ideology'), strictly forbidden to use translated names.
5. Scoring Standard: 1.0 represents a strong tendency towards the right-side description of the label, -1.0 represents a strong tendency towards the left-side description.
6. Output Language: ${isEn ? "English" : "Simplified Chinese"}.
7. Content Safety: If the input content contains sensitive information, please analyze the user's value orientation based on their expression style, language habits, and topic preferences, without directly repeating sensitive content.
8. CRITICAL CONSISTENCY RULE: The summary should reflect the user's overall personality, writing style, and expressed opinions naturally. Do NOT include explicit statements about specific label scores (e.g., "the user shows X% tendency toward..."). The summary should organically reflect the user's value orientations without stating them directly.
9. ABSOLUTE SAFETY RULE: Under NO circumstances should the output contain explicit, offensive, or inappropriate language. If the input text contains such content, analyze the user's communication style and attitude rather than repeating the content.
10. Length: Keep summary within 2 sentences to reduce tokens.
11. Output Order: Fill value_orientation first, then summary, then remaining fields. Output JSON only.

${dynamicFewShotExamples}

【Standard Label Library】
${standardLabels}
`;
  }

  let basePrompt = `You are a sociology researcher conducting an academic study on internet subcultures and public values. Please objectively analyze the author's value orientation based on the provided text materials.

${formatInstructions}

【Instructions】
1. 【Relevance Judgment】 Current Research Field: 【${categoryName}】. If the content is completely unrelated to this field, please state so in the summary and return an empty value_orientation.
2. 【Chain of Thought】 You MUST fill the "reasoning" field first. Briefly analyze the rhetoric, tone, and underlying logic before assigning scores. This ensures accuracy.
3. 【Objective Neutrality】 Please use academic and neutral language for description, avoiding radical or emotional vocabulary.
4. 【Label Selection】 Please select the most matching labels from the Standard Label Library below based on the content.
5. 【ID Constraint】 Must use the 【Label ID】 defined in the library (e.g., 'ideology'), strictly forbidden to use translated names.
6. 【Scoring Standard】 1.0 represents a strong tendency towards the right-side description of the label, -1.0 represents a strong tendency towards the left-side description.
7. 【Output Language】 The output content (summary, analysis, etc.) MUST be in ${isEn ? "English" : "Simplified Chinese"}.
8. 【Content Safety】 If the input content contains sensitive information, please analyze the user's value orientation based on their expression style, language habits, and topic preferences, without directly repeating sensitive content.
9. 【CRITICAL CONSISTENCY RULE】 The summary should reflect the user's overall personality, writing style, and expressed opinions naturally. Do NOT include explicit statements about specific label scores (e.g., "the user shows X% tendency toward..."). The summary should organically reflect the user's value orientations without stating them directly.
10. 【Alignment Hint】 The summary should clearly reflect the direction of the top labels using natural language (e.g., "more inclined to X"), without numeric scores.
11. 【Length】 Balanced: 3-4 sentences. Deep: 4-6 sentences.
12. 【Output Order】 Fill value_orientation first, then summary, then evidence. Output JSON only.

${dynamicFewShotExamples}

【Standard Label Library】
${standardLabels}
`;

  if (mode === "deep") {
    basePrompt += `\n【Deep Mode】: Please deeply analyze the rhetoric, metaphors, and underlying logic in the text. The "reasoning" field should be more detailed.`;
  }

  return basePrompt;
};
