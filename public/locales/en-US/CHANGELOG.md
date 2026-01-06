# DeepProfile Development Progress and Changelog

## Current Version: v0.5.1 (Beta)

### ✅ Features Achieved

#### Core Feature (v0.5.1) - Multi-language Support (i18n)
- [x] **Internationalization Architecture**: Introduced a lightweight `I18nService` for dynamic language switching.
- [x] **Bilingual Interface**: Full support for **Simplified Chinese (zh-CN)** and **English (en-US)**.
    - Options Page
    - Profile Card Overlay
    - Error messages and status feedback
- [x] **Bilingual AI Analysis**: 
    - Optimized prompt engineering to force AI output in the selected language.
    - The label system supports bilingual display (e.g., "左派 vs 右派" / "Left vs Right").
- [x] **Dynamic Switching**: The interface updates instantly after changing the language in the settings, no restart required.

#### Core Feature (v0.5.0) - Comment Section Sentiment Summary
- [x] **Sentiment Overview**: Added a "📊 Summarize Current Page" button at the top of Zhihu comment sections to generate an overview of the page's sentiment.
- [x] **Zero-Risk Analysis**: Only analyzes comments already loaded on the current page, **no Zhihu API calls**, completely avoiding anti-spam risks.
- [x] **Position Distribution**: Automatically calculates the proportion of supporters, opponents, and neutral observers, displayed with visual progress bars.
- [x] **Core Points Extraction**: Intelligently summarizes 3-5 recurring core arguments in the comment section with typical comment excerpts.
- [x] **Emotion Detection**: Automatically judges the comment section's atmosphere (positive/negative/highly controversial).

#### Core Feature (v0.4.2) - Export Enhancement and UX Optimization
- [x] **Enhanced Image Export**:
    - **Personalized Avatars**: Exported profile cards now display the user's **Zhihu avatar**, not the plugin's default logo.
    - **QR Code Sharing**: Added a QR code pointing to the Chrome Store at the bottom of the card for easy sharing.
    - **Technical Breakthrough**: Resolved `html2canvas` cross-origin image rendering issues to ensure stable avatar display.
- [x] **Enhanced History Records**:
    - **Full-Function Export**: Added an "📸 Export as Image" button for each record in the background history management.
    - **Display Fix**: Fixed the issue where user nicknames were displayed as IDs in the history records list, now prioritizing user nicknames.
- [x] **Error Prompt Optimization**:
    - **Human Translation**: Replaced boring HTTP error codes (401, 402, 429, etc.) with playful and easy-to-understand Chinese prompts (e.g., "Wallet is empty", "Access denied").
    - **403 Guidance**: Added friendly prompts to refresh the page or log in for Zhihu API 403 errors.
- [x] **UI Details**:
    - Added user avatar display to the header of the analysis result overlay cards.

#### Core Feature (v0.4.1) - Performance Optimization and Prompt Simplification
- [x] **Dynamic Prompt Trimming**: 
    - **On-demand Loading**: Based on the current topic category (e.g., "Technology"), only sends relevant label definitions to the LLM, rather than sending all labels.
    - **Token Savings**: Reduced system prompt length by approximately 60%, significantly reducing token consumption and improving response speed.
    - **Enhanced Focus**: Reduces irrelevant label interference, allowing the LLM to focus more on the current field of analysis.
- [x] **Label System Optimization**:
    - Refactored `LabelService` to support category-based label definition retrieval.
    - Optimized `TopicService` to improve keyword matching accuracy.

#### Core Feature (v0.4.0) - History and Cache System
- [x] **Local Cache Mechanism**: 
    - Automatically stores generated user profiles locally (`chrome.storage.local`).
    - Uses a **"User Aggregation + Field Layering"** storage structure, where the same user's profiles in different fields (e.g., politics, entertainment) do not interfere with each other.
    - Default cache validity is 24 hours, expiring automatically.
- [x] **Smart Cache Hit**: 
    - **Second-level Response**: When revisiting an analyzed user, directly loads results from the cache without waiting for API requests.
    - **Zero Token Consumption**: No LLM interface calls when cache hits, saving costs.
    - **Field Adaptation**: Automatically recognizes the current topic field, prioritizing loading of historical profiles in that field.
- [x] **History Management**:
    - Added a "History" panel to the settings page.
    - Supports viewing all analyzed user lists (sorted by time).
    - Supports expanding to view detailed field profiles for each user (politics, economy, entertainment, etc.).
    - Supports refined deletion (single profile, single user) or one-click clearing.
- [x] **Force Refresh**:
    - Added a "Re-analyze" button to the analysis result card, allowing users to ignore cache and force updates.

#### Core Feature (v0.3.0)
- [x] **Multi-Platform Architecture**: Reserved extension interfaces for multi-platform support like Reddit.
- [x] **Multi-Model Support**:
    - Added **Qwen (Tongyi)** and **Custom (OpenAI Compatible)** service providers.
    - Supports **dynamic loading of model lists** to avoid manual input errors.
- [x] **Zhihu Data Scraping**: 
    - Automatically parses user Hash ID to URL Token.
    - **Hybrid Data Sources**: Parallel scraping of users' **original content (answers/articles)** and **endorsement dynamics**.
    - Supports scraping quantity configuration (10-50 items).
- [x] **Context-Aware**:
    - **Precise Extraction**: Automatically extracts the current page's question title and **Zhihu's official topic tags**.
    - **Intelligent Classification**: Introduces **TopicService** to automatically classify topics into eight major macro fields such as "politics", "economy", and "technology".
    - **Hybrid Classification Strategy**: Prioritizes keyword matching, automatically downgrading to LLM intelligent classification when matching fails.
- [x] **Deep Profile Generation**:
    - **Content First**: Prioritizes extracting and analyzing **answer/article body**, not brief summaries.
    - **Risk Avoidance**: Renames "political tendency" to "**value orientation**", conducting neutral analysis from multiple dimensions such as "economy", "culture", and "international perspective".
    - **Contradiction Analysis**: Requires LLM to explain contradictions in user viewpoints in the summary.
    - **Evidence Citation**: Provides clickable original citation links, supporting navigation to specific answers/articles.

#### User Experience (UI/UX)
- [x] **Seamless Injection**: Only displays the "🔍" icon to the right of the user nickname, automatically filtering avatars and duplicate links.
- [x] **Real-time Feedback**: 
    - Click to display user nickname.
    - Detailed progress prompts (Get information -> Scrape dynamics -> AI analysis).
- [x] **Result Display**:
    - **Multi-dimensional Value Map**: Uses progress bars to display value orientation on different dimensions.
    - Collapsible evidence sections to keep the interface clean.
- [x] **Connection Test**: Provides "Test Connection" functionality on the settings page with **friendly Chinese error prompts** (e.g., insufficient balance, invalid Key).

#### Advanced Settings
- [x] **Custom Configuration**:
    - **Model Dropdown Selection**: Automatically retrieves and displays available model lists.
    - Custom API Base URL (supports proxy).
- [x] **Analysis Mode**:
    - **⚡ Fast**: Quick overview.
    - **⚖️ Balanced**: Standard analysis.
    - **🧠 Deep**: Enables Chain of Thought (CoT), deeply identifying irony and metaphor.
- [x] **Developer Debug (Debug Mode)**:
    - **Transparency**: Added `Source` field, clearly showing "How much scraped -> How much relevant found -> How much finally analyzed".
    - **Data Traceability**: Added `Breakdown` field, showing the ratio of original content vs endorsement content.

---

## Version History

### v0.5.1 (2024-01-10) - Multi-language Support
*   **Major Feature**: Full support for **Simplified Chinese** and **English** bilingual switching.
*   **Feature**: AI analysis results automatically adapt to the selected language.
*   **Refactor**: Introduced `I18nService` to centrally manage text resources.

### v0.5.0 (2024-01-09) - Comment Section Sentiment Summary
*   **Major Feature**: **Comment Section Sentiment Summary**, one-click generation of current page's sentiment profile, including position distribution, core points, and emotion detection.
*   **Security**: Adopted **zero-risk analysis** strategy, only analyzing loaded DOM text without calling Zhihu API, completely avoiding anti-spam risks.

### v0.4.2 (2024-01-08) - Export Enhancement and UX Optimization
*   **Feature**: Export images support displaying user avatars and QR codes.
*   **Feature**: History management supports image export.
*   **Fix**: Fixed user nickname display issues in history records.
*   **Fix**: Optimized Zhihu API request headers to resolve 403 issues.
*   **UX**: Error prompt copy optimization, more user-friendly and playful.

### v0.4.1 (2024-01-07) - Performance Optimization
*   **Optimization**: **Dynamic Prompt Trimming**, loading only relevant label definitions by topic category, significantly reducing token consumption and improving response speed.
*   **Refactor**: Optimized label service and topic service, improving code maintainability.

### v0.4.0 (2024-01-06) - History and Intelligent Classification
*   **Major Feature**: **History System**, supporting local cache, second-level response, and visual management.
*   **Major Feature**: **Eight-Dimension Full-Spectrum Classification**, introducing 30+ sub-dimensions in politics, economy, society, technology, etc., for more立体profiles.
*   **Feature**: **Hybrid Classification Strategy**, combining keyword matching with LLM intelligent classification to ensure accurate topic classification.
*   **Feature**: **Field Adaptive Analysis**, LLM automatically judges content relevance to avoid incorrect cross-assignment analysis.
*   **Optimization**: **Deep Prompt Desensitization**, significantly reducing the probability of triggering content security anti-spam.
*   **UI**: Added "History" panel to settings page, supporting expansion view and refined management.

### v0.3.0 (2024-01-04) - Precise Focus and UX Optimization
*   **Major Feature**: **Reconstructed Context-Aware Algorithm**, using topic tags for precise matching and dynamic truncation strategy to completely solve topic deviation issues.
*   **Major Feature**: **Reconstructed Prompt**, using "value orientation" instead of "political tendency" to avoid domestic model anti-spam, and requiring AI to explain contradictions.
*   **Feature**: **Added "Connection Test" Function**, providing friendly Chinese error prompts.
*   **Feature**: **Dynamic Loading of Model Lists**, upgrading the model name input box to a dropdown selection box.
*   **Feature**: Added support for **Qwen** and **Custom OpenAI Compatible Interface**.
*   **Feature**: Data source adds **user likes dynamics** and can display source ratios in the Debug panel.
*   **Fix**: Prioritizes extracting and analyzing the **complete body** of answers/articles, not brief summaries.
*   **UI**: Settings page UI modernization, adopting card-based layout.

### v0.2.0 (2024-01-03) - Deep Analysis and Context Awareness
*   **Feature**: Added context-aware functionality, automatically filtering user-related answers based on the current browsing question.
*   **Feature**: Added "Analysis Mode" settings (Fast/Balanced/Deep), with Deep mode supporting irony recognition.
*   **Feature**: Profile labels add confidence probability display.
*   **Feature**: Enhanced Debug mode, displaying topic classification and scraping strategy.
*   **Fix**: Optimized injection logic, precisely positioning to the right of the nickname, excluding avatar interference.
*   **Fix**: Fixed citation links using API format issues, unified to web links.

### v0.1.0 (2024-01-02) - MVP Release
*   **Feature**: Completed basic architecture (Plasmo + React + TypeScript).
*   **Feature**: Implemented Zhihu API scraping and cleaning.
*   **Feature**: Connected OpenAI/Gemini/Ollama interfaces.
*   **Feature**: Implemented basic UI injection and profile display cards.
*   **Feature**: Supports API Key configuration.

---

## 📅 Roadmap

- [ ] **More Platforms**: Explore support for other platforms like Reddit, Bilibili, Weibo, etc.