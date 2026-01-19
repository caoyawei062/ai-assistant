// 站点检测器工厂
import type { SiteDetector } from "../types/site";
import { ChatGPTDetector } from "./chatgpt";
import { ClaudeDetector } from "./claude";
import { GeminiDetector } from "./gemini";
import { DoubaoDetector } from "./doubao";

export class DetectorFactory {
  private static detectors: SiteDetector[] = [
    new ChatGPTDetector(),
    new ClaudeDetector(),
    new GeminiDetector(),
    new DoubaoDetector(),
  ];

  /**
   * 检测当前站点
   */
  static detectCurrentSite(): SiteDetector | null {
    for (const detector of this.detectors) {
      const site = detector.detect();
      if (site) {
        return detector;
      }
    }
    return null;
  }

  /**
   * 获取所有检测器
   */
  static getAllDetectors(): SiteDetector[] {
    return [...this.detectors];
  }

  /**
   * 根据站点类型获取检测器
   */
  static getDetectorBySite(site: string): SiteDetector | null {
    for (const detector of this.detectors) {
      if (detector.detect() === site) {
        return detector;
      }
    }
    return null;
  }
}
