import * as z from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

// Define Zod schemas for structured output
const ValueOrientationSchema = z.object({
  label: z.string(),
  score: z.number().min(-1).max(1)
});

const EvidenceSchema = z.object({
  quote: z.string(),
  analysis: z.string(),
  source_title: z.string(),
  source_id: z.string().optional()
});

export const FastProfileSchema = z.object({
  nickname: z.string(),
  topic_classification: z.string(),
  value_orientation: z.array(ValueOrientationSchema),
  summary: z.string()
});

export const BalancedDeepProfileSchema = z.object({
  nickname: z.string(),
  topic_classification: z.string(),
  reasoning: z.string(),
  value_orientation: z.array(ValueOrientationSchema),
  summary: z.string(),
  evidence: z.array(EvidenceSchema)
});

export class StructuredOutputService {
  static getParserForMode(mode: 'fast' | 'balanced' | 'deep') {
    if (mode === 'fast') {
      return StructuredOutputParser.fromZodSchema(FastProfileSchema);
    } else {
      return StructuredOutputParser.fromZodSchema(BalancedDeepProfileSchema);
    }
  }

  static getFormatInstructions(mode: 'fast' | 'balanced' | 'deep'): string {
    const parser = this.getParserForMode(mode);
    return parser.getFormatInstructions();
  }

  static async parseOutput(output: string, mode: 'fast' | 'balanced' | 'deep') {
    const parser = this.getParserForMode(mode);
    return parser.parse(output);
  }
}