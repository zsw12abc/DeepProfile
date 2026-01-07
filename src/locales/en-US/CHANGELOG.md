# DeepProfile Development Progress and Changelog

## Current Version: v0.5.1 (Beta)

### ✅ Features Achieved

### Core Feature (v0.5.1) - Multi-language Support (i18n)
- ✅ **Internationalization Architecture**: Introduced a lightweight `I18nService` for dynamic language switching.
- ✅ **Bilingual Interface**: Full support for **Simplified Chinese (zh-CN)** and **English (en-US)**.
    - Options Page
    - Profile Card Overlay
    - Error messages and status feedback
- ✅ **Bilingual AI Analysis**: 
    - Optimized prompt engineering to force AI output in the selected language.
    - The label system supports bilingual display (e.g., "左派 vs 右派" / "Left vs Right").
- ✅ **Dynamic Switching**: The interface updates instantly after changing the language in the settings, no restart required.

### Core Feature (v0.5.0) - Comment Sentiment Summary
- ✅ **Sentiment Overview**: Added a "📊 Summarize Page Views" button at the top of Zhihu comments section to generate an overview of current page's sentiment with one click.
- ✅ **Zero-risk Analysis**: Only analyzes loaded comment text on current page, **does not call Zhihu API**, completely avoiding risk control and account blocking.
- ✅ **Position Distribution**: Automatically calculates the proportion of supporters, opponents, and neutral observers, displaying with visual progress bars.
- ✅ **Core Points Extraction**: Intelligently summarizes 3-5 recurring core arguments in the comments section, with typical comment excerpts attached.
- ✅ **Emotion Detection**: Automatically determines the comment section atmosphere (positive/negative/highly controversial).

### Core Feature (v0.4.2) - Enhanced Export Functionality and UX Optimization
- ✅ **Image Export Upgrade**:
    - **Personalized Avatar**: Exported profile cards now display the user's **Zhihu avatar**, not the default plugin logo.
    - **QR Code Sharing**: Added QR code pointing to Chrome Web Store at the bottom of card for easy sharing and distribution.
    - **Technical Breakthrough**: Solved `html2canvas` cross-origin image rendering issues, ensuring stable avatar display.
- ✅ **Enhanced History Records**:
    - **Full Function Export**: Added "📸 Export as Image" button to each record in the background history management.
    - **Display Fix**: Fixed the issue where user nicknames were displayed as IDs in history records, now prioritizing display of user nicknames.
- ✅ **Error Prompt Optimization**:
    - **Plain Language Translation**: Replaced boring HTTP error codes (401, 402, 429, etc.) with witty, easy-to-understand Chinese prompts (such as "Wallet Empty", "Wrong Password").
    - **403 Guidance**: Added friendly prompts guiding users to refresh the page or log in for Zhihu API 403 errors.
- ✅ **UI Details**:
    - Added user avatar display to the header of the analysis result overlay card.

### Core Feature (v0.4.1) - Performance Optimization and Prompt Simplification
- ✅ **Dynamic Prompt Trimming**: 
    - **On-demand Loading**: Based on current topic category (e.g. "Technology"), only send relevant label definitions under that category to LLM, instead of sending all labels.
    - **Token Savings**: System Prompt length reduced by approximately 60%, significantly reducing Token consumption and improving response speed.
    - **Improved Focus**: Reduces interference from irrelevant labels, allowing LLM to focus more on current domain analysis.
- ✅ **Label System Optimization**:
    - Refactored `LabelService` to support fetching label definitions by category.
    - Optimized `TopicService` to improve keyword matching accuracy.

### Core Feature (v0.4.0) - History Record and Cache System
- ✅ **Local Cache Mechanism**: 
    - Automatically stores generated user profiles locally (`chrome.storage.local`).
    - Uses **"User Aggregation + Domain Layering"** storage structure, ensuring that a user's profiles in different domains (e.g. politics, entertainment) do not interfere with each other.
    - Default cache validity is 24 hours, expiring automatically.
- ✅ **Smart Cache Hit**: 
    - **Second-level Response**: When revisiting an analyzed user, directly load results from cache without waiting for API requests.
    - **Zero Token Consumption**: Does not call LLM interface when cache hits, saving costs.
    - **Domain Adaptation**: Automatically recognizes current topic domain, prioritizing loading of historical profiles in that domain.
- ✅ **History Record Management**:
    - Added "History Records" panel to settings page.
    - Supports viewing list of all analyzed users (sorted by time).
    - Supports expanding to view detailed domain profiles for each user (politics, economy, entertainment, etc.).
    - Supports fine-grained deletion (single profile, single user) or one-click clearing.
- ✅ **Force Refresh**:
    - Added "Re-analyze" button to analysis result card, allowing users to ignore cache and force update.

### Core Feature (v0.3.0)
- ✅ **Multi-platform Architecture**: Reserved extension interfaces for multi-platform support such as Reddit.
- ✅ **Multi-model Support**:
    - Added **Qwen (Tongyi Qianwen)** and **Custom (OpenAI Compatible)** service providers.
    - Supports **dynamic loading of model list**, avoiding manual input errors.
- ✅ **Zhihu Data Scraping**: 
    - Automatically parses user Hash ID to URL Token.
    - **Hybrid Data Sources**: Parallel scraping of user's **original content (answers/articles)** and **endorsement activities**.
    - Supports scraping quantity configuration (10-50 items).
- ✅ **Context-aware**:
    - **Precise Extraction**: Automatically extracts current page's question title and **official Zhihu topic tags**.
    - **Intelligent Classification**: Introduced **TopicService**, automatically classifying topics into eight major macro domains such as "politics", "economy", "technology", etc.
    - **Hybrid Classification Strategy**: Prioritizes keyword matching, automatically degrading to LLM intelligent classification when matching fails.
- ✅ **Deep Profile Generation**:
    - **Content First**: Prioritizes extraction and analysis of **answer/article body**, not brief summaries.
    - **Risk Control**: Changed "political orientation" to "value orientation", conducting neutral analysis from multiple dimensions such as "economics", "culture", "international perspective", etc.
    - **Contradiction Analysis**: Requires LLM to explain contradictions in user opinions in the summary.
    - **Evidence Citation**: Provides clickable original citation links, supporting navigation to specific answers/articles.

### User Experience (UI/UX)
- ✅ **Seamless Injection**: Only displays "🔍" icon to the right of user nickname, automatically filtering avatars and duplicate links.
- ✅ **Real-time Feedback**: 
    - Click to display user nickname.
    - Detailed progress prompts (fetching information -> scraping dynamics -> AI analysis).
- ✅ **Result Display**:
    - **Multi-dimensional Value Map**: Uses progress bars to display value orientations across different dimensions.
    - Collapsible evidence panel, maintaining interface tidiness.
- ✅ **Connection Test**: Provides "Test Connection" function on settings page, returning **friendly Chinese error prompts** (such as insufficient balance, invalid key).

### Advanced Settings
- ✅ **Custom Configuration**:
    - **Model Dropdown Selection**: Automatically acquires and displays available model list.
    - Custom API Base URL (supports proxy).
- ✅ **Analysis Mode**:
    - **⚡ Fast**: Quick overview.
    - **⚖️ Balanced**: Standard analysis.
    - **🧠 Deep**: Enables Chain of Thought (CoT), deep identification of irony and metaphor.
- ✅ **Developer Debug (Debug Mode)**:
    - **Transparency**: Added `Source` field, clearly showing "how many fetched -> how many found relevant -> how many finally analyzed".
    - **Data Tracing**: Added `Breakdown` field, showing original content vs endorsement content ratio.

---

## Version History

### v0.5.1 (2024-01-10) - Multi-language Support
*   **Major Feature**: Full support for **Simplified Chinese** and **English** bilingual switching.
*   **Feature**: AI analysis results automatically adapt to selected language.
*   **Refactor**: Introduced `I18nService` to manage text resources uniformly.

### v0.5.0 (2024-01-09) - Comment Sentiment Summary
*   **Major Feature**: **Comment Sentiment Summary**, one-click generation of page sentiment profile, including position distribution, core views, and emotion detection.
*   **Security**: Adopted **zero-risk analysis** strategy, only analyzing loaded DOM text, not calling Zhihu API, completely avoiding risk control.

### v0.4.2 (2024-01-08) - Enhanced Export and UX Optimization
*   **Feature**: Export images support displaying user avatars and QR codes.
*   **Feature**: History record management supports image export.
*   **Fix**: Fixed user nickname display issue in history records.
*   **Fix**: Optimized Zhihu API request headers, resolving 403 issue.
*   **UX**: Error prompt copy optimized, more friendly and witty.

### v0.4.1 (2024-01-07) - Performance Optimization
*   **Optimization**: **Dynamic Prompt Trimming**, based on topic category only loads relevant label definitions, significantly reducing Token consumption and improving response speed.
*   **Refactor**: Optimized label service and topic service, improving code maintainability.

### v0.4.0 (2024-01-06) - History Records and Intelligent Classification
*   **Major Feature**: **History Record System**, supporting local cache, second-level response, and visual management.
*   **Major Feature**: **Eight-dimensional Full Spectrum Classification**, introducing 30+ sub-dimensions in politics, economy, society, technology, etc., making profiles more three-dimensional.
*   **Feature**: **Hybrid Classification Strategy**, combining keyword matching with LLM intelligent classification, ensuring accurate topic categorization.
*   **Feature**: **Domain Adaptive Analysis**, LLM automatically judges content relevance, avoiding incorrect analysis due to topic mismatch.
*   **Optimization**: **Deep Prompt Desensitization**, significantly reducing probability of triggering content security risk control.
*   **UI**: Added "History Records" panel to settings page, supporting expansion view and fine-grained management.

### v0.3.0 (2024-01-04) - Precise Focus and UX Optimization
*   **Major Feature**: **Refactored Context-aware Algorithm**, using topic tags for precise matching and adopting dynamic truncation strategy, completely solving topic deviation issues.
*   **Major Feature**: **Refactored Prompt**, using "value orientation" instead of "political orientation", avoiding domestic model risk control, and requiring AI to explain contradiction points.
*   **Feature**: **New "Connection Test" Function**, providing friendly Chinese error prompts.
*   **Feature**: **Dynamic Model List Loading**, upgraded model name input box to dropdown selection box.
*   **Feature**: Added support for **Qwen (Tongyi Qianwen)** and **Custom OpenAI Compatible Interface**.
*   **Feature**: Data source adds **user like activity**, and can display source ratio in Debug panel.
*   **Fix**: Prioritizes extracting and analyzing **complete body** of answers/articles, not brief summaries.
*   **UI**: Modernized settings page UI, adopting card-based layout.

### v0.2.0 (2024-01-03) - Deep Analysis and Context Awareness
*   **Feature**: Added context-aware functionality, automatically filtering user's relevant answers based on current browsing question.
*   **Feature**: Added "Analysis Mode" setting (Fast/Balanced/Deep), Deep mode supports irony identification.
*   **Feature**: Profile labels added confidence probability display.
*   **Feature**: Enhanced Debug mode, displaying topic classification and scraping strategy.
*   **Fix**: Optimized injection logic, precisely positioning to the right of nickname, excluding avatar interference.
*   **Fix**: Fixed issue where citation links were in API format, unified to web links.

### v0.1.0 (2024-01-02) - MVP Release
*   **Feature**: Completed basic architecture (Plasmo + React + TypeScript).
*   **Feature**: Implemented Zhihu API scraping and cleaning.
*   **Feature**: Connected OpenAI/Gemini/Ollama interfaces.
*   **Feature**: Implemented basic UI injection and profile display card.
*   **Feature**: Supports API Key configuration.

---

## 📅 Roadmap

- [ ] **More Platforms**: Explore support for Reddit, Bilibili, Weibo, and other platforms.
