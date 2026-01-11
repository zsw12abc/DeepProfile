import { defineConfig } from "@plasmohq/plasmo"

export default defineConfig({
  manifest: {
    name: "DeepProfile",
    icons: {
      "16": "public/icon.png",
      "32": "public/icon.png",
      "48": "public/icon.png",
      "128": "public/icon.png"
    },
    host_permissions: [
      "https://www.zhihu.com/*",
      "https://*.zhimg.com/*",
      "https://www.reddit.com/*",
      "https://old.reddit.com/*",
      "https://reddit.com/*",
      "https://oauth.reddit.com/*",
      "https://api.reddit.com/*"
    ],
    permissions: [
      "storage",
      "cookies"
    ]
  }
})