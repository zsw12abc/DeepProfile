import React from "react";
import { type AIProvider } from "~types";

// 图标组件
export const ZhihuIcon = <img src="https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.a53ae37b.png" alt="Zhihu" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "contain" }} />;
export const RedditIcon = <img src="https://www.redditstatic.com/desktop2x/img/favicon/apple-icon-120x120.png" alt="Reddit" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "contain" }} />;
export const TwitterIcon = <img src="https://abs.twimg.com/icons/apple-touch-icon-192x192.png" alt="Twitter" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", backgroundColor: "white", border: "1px solid #e2e8f0" }} />;
export const QuoraIcon = <img src="https://qsf.fs.quoracdn.net/-4-ans_frontend_assets.favicon-new.ico-26-e7e93fe0a7fbc991.ico" alt="Quora" style={{ width: "24px", height: "24px", objectFit: "cover", backgroundColor: "white", border: "1px solid #e2e8f0" }} />;

// 获取API基础URL占位符的函数
export const getBaseUrlPlaceholder = (provider: AIProvider) => {
  switch(provider) {
    case 'ollama': return "http://localhost:11434";
    case 'qwen': return "https://dashscope.aliyuncs.com/compatible-mode/v1";
    case 'deepseek': return "https://api.deepseek.com/v1";
    case 'custom': return "https://api.example.com/v1";
    default: return "https://api.openai.com/v1";
  }
};

// 检查是否显示基础URL输入框
export const shouldShowBaseUrlInput = (provider: AIProvider) => {
  return provider === "ollama" || 
         provider === "custom" || 
         provider === "qwen" ||
         provider === "deepseek" ||
         provider === "openai";
};