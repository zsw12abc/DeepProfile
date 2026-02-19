import { LLMService } from "./LLMService";
import type { MacroCategory } from "~types";

export class PerformanceTest {
  /**
   * 测试不同分析模式下的性能
   */
  static async testPerformance() {
    console.log("开始性能测试...");

    // 模拟一些测试数据
    const testContent = `我最近在研究人工智能的发展趋势。我认为AI技术将会极大地改变我们的生活方式。从技术角度来看，深度学习和神经网络的发展为AI提供了强大的基础。在实际应用中，我们可以看到AI在医疗、教育、金融等多个领域都有显著的应用。特别是在自然语言处理方面，大语言模型的出现使得机器能够更好地理解和生成人类语言。不过，AI的发展也带来了一些挑战，比如数据隐私、算法偏见等问题需要我们认真对待。`;

    const categories: MacroCategory[] = ["technology", "society", "general"];

    for (const category of categories) {
      console.log(`\\n测试类别: ${category}`);

      // 测试快速模式
      await this.testMode("fast", testContent, category);

      // 测试平衡模式
      await this.testMode("balanced", testContent, category);

      // 测试深度模式
      await this.testMode("deep", testContent, category);
    }
  }

  private static async testMode(
    mode: "fast" | "balanced" | "deep",
    content: string,
    category: MacroCategory,
  ) {
    console.log(`  ${mode} 模式测试开始...`);

    try {
      const startTime = Date.now();
      const result = await LLMService.generateProfile(content, category);
      const duration = result.durationMs || Date.now() - startTime;

      console.log(`    ${mode} 模式耗时: ${duration}ms`);
      console.log(`    模型: ${result.model}`);

      if (result.content) {
        console.log(
          `    分析结果预览: ${result.content.summary?.substring(0, 50) || "N/A"}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`    ${mode} 模式测试失败:`, message);
    }
  }

  /**
   * 批量测试函数，用于更全面的性能评估
   */
  static async batchPerformanceTest() {
    console.log("\\n开始批量性能测试...");

    const testContent = `我最近在研究人工智能的发展趋势。我认为AI技术将会极大地改变我们的生活方式。从技术角度来看，深度学习和神经网络的发展为AI提供了强大的基础。在实际应用中，我们可以看到AI在医疗、教育、金融等多个领域都有显著的应用。特别是在自然语言处理方面，大语言模型的出现使得机器能够更好地理解和生成人类语言。不过，AI的发展也带来了一些挑战，比如数据隐私、算法偏见等问题需要我们认真对待。`;

    const iterations = 5;
    const results: { mode: string; duration: number }[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`\\n第 ${i + 1} 轮测试:`);

      // 测试快速模式
      const fastResult = await this.measureModePerformance(
        "fast",
        testContent,
        "technology",
      );
      results.push({ mode: "fast", duration: fastResult });

      // 测试平衡模式
      const balancedResult = await this.measureModePerformance(
        "balanced",
        testContent,
        "technology",
      );
      results.push({ mode: "balanced", duration: balancedResult });
    }

    // 统计结果
    this.printPerformanceStats(results);
  }

  private static async measureModePerformance(
    mode: "fast" | "balanced" | "deep",
    content: string,
    category: MacroCategory,
  ): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await LLMService.generateProfile(content, category);
      return result.durationMs || Date.now() - startTime;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${mode} 模式测试失败:`, message);
      return -1; // 表示失败
    }
  }

  private static printPerformanceStats(
    results: { mode: string; duration: number }[],
  ) {
    console.log("\\n性能统计结果:");

    const modes = ["fast", "balanced"];
    for (const mode of modes) {
      const modeResults = results.filter(
        (r) => r.mode === mode && r.duration > 0,
      );
      if (modeResults.length > 0) {
        const durations = modeResults.map((r) => r.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        console.log(`  ${mode} 模式:`);
        console.log(`    平均耗时: ${avg.toFixed(2)}ms`);
        console.log(`    最短耗时: ${min}ms`);
        console.log(`    最长耗时: ${max}ms`);
        console.log(`    测试次数: ${modeResults.length}`);
      }
    }
  }
}
