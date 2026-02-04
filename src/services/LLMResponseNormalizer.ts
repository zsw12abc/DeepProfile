import { ConfigService } from "./ConfigService";
import { normalizeLabelId } from "./LLMLabelNormalizer";
import { Logger } from "./Logger";

export const normalizeAndFixResponse = (response: string): string => {
  try {
    let cleanedResponse = response.trim();

    let config;
    try {
      config = ConfigService.getConfigSync();
    } catch (e) {
      // 如果同步获取配置失败，跳过调试日志
    }
    if (config && config.enableDebug) {
      Logger.info("【LLM RAW RESPONSE】", response);
    }

    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.substring(7);
      if (config && config.enableDebug) {
          Logger.info("【LLM RESPONSE】Removed '```json' prefix");
      }
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.substring(3);
      if (config && config.enableDebug) {
          Logger.info("【LLM RESPONSE】Removed '```' prefix");
      }
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      if (config && config.enableDebug) {
          Logger.info("【LLM RESPONSE】Removed '```' suffix");
      }
    }
    cleanedResponse = cleanedResponse.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedResponse);
    } catch (parseError) {
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          if (config && config.enableDebug) {
            Logger.info("【LLM RESPONSE】Successfully extracted JSON from text");
          }
        } catch (extractError) {
          console.error("Failed to extract JSON from response:", extractError);
          throw new Error(`Could not parse LLM response as JSON: ${response}`);
        }
      } else {
        console.error("Could not find JSON object in response:", response);
        throw new Error(`Could not parse LLM response as JSON: ${response}`);
      }
    }

    if (!parsed.value_orientation) {
      if (parsed.political_leaning) {
        parsed.value_orientation = parsed.political_leaning;
        if (config && config.enableDebug) {
            Logger.info("【LLM RESPONSE】Using 'political_leaning' field as 'value_orientation'");
        }
      } else {
        console.warn("LLM response missing 'value_orientation' field");
        parsed.value_orientation = [];
      }
    }
    delete parsed.political_leaning;

    if (Array.isArray(parsed.value_orientation)) {
      const originalLength = parsed.value_orientation.length;
      parsed.value_orientation = parsed.value_orientation.map((item: any, index: number) => {
        if (typeof item === 'string') {
          console.warn(`LLM returned string label at index ${index}: ${item}. Converting to object.`);
          return { label: normalizeLabelId(item.trim()), score: 0.5 };
        } else if (typeof item === 'object' && item.label) {
          let score = item.score !== undefined ? item.score : 0.5;

          if (typeof score !== 'number' || isNaN(score)) {
            console.warn(`Invalid score value at index ${index}: ${score}. Using 0.5 as default.`);
            score = 0.5;
          } else {
            score = Math.max(-1, Math.min(1, score));
            if (score !== item.score && config && config.enableDebug) {
              Logger.info(`Normalized score at index ${index}: ${item.score} -> ${score}`);
            }
          }

          const originalLabel = item.label;
          const normalizedLabel = normalizeLabelId(String(originalLabel).trim());

            if (originalLabel !== normalizedLabel && config && config.enableDebug) {
              Logger.info(`Normalized label at index ${index}: ${originalLabel} -> ${normalizedLabel}`);
            }

          return { label: normalizedLabel, score };
        }

        console.warn(`Invalid value_orientation item at index ${index}:`, item);
        return { label: "Unknown", score: 0.5 };
      });

        if (config && config.enableDebug) {
          Logger.info(`【LLM RESPONSE】Processed ${originalLength} labels, got ${parsed.value_orientation.length} valid labels`);
        }
    } else {
      console.warn("LLM response 'value_orientation' is not an array, resetting to empty array");
      parsed.value_orientation = [];
    }

    if (!parsed.nickname) parsed.nickname = "";
    if (!parsed.topic_classification) parsed.topic_classification = "Unknown";
    if (!parsed.summary) parsed.summary = "Analysis completed.";
    if (!parsed.evidence) parsed.evidence = [];

    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    console.error("Response validation error:", e, "Raw response:", response);
    return JSON.stringify({
      nickname: "",
      topic_classification: "Unknown",
      value_orientation: [],
      summary: "Analysis Failed",
      evidence: []
    }, null, 2);
  }
};
