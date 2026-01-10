import { zhCN } from "../locales/zh-CN";
import { enUS } from "../locales/en-US";
import type { LocaleKey, LocaleDict } from "../locales/index";
import type { Language } from "../types";
import { ConfigService } from "./ConfigService";

export class I18nService {
  private static currentLang: Language = 'zh-CN';
  private static dict: LocaleDict = zhCN;

  static async init() {
    const config = await ConfigService.getConfig();
    this.setLanguage(config.language);
  }

  static setLanguage(lang: Language) {
    this.currentLang = lang;
    this.dict = lang === 'en-US' ? enUS : zhCN;
  }

  static getLanguage(): Language {
    return this.currentLang;
  }

  static t(key: LocaleKey): string {
    return this.dict[key] || key;
  }
}
