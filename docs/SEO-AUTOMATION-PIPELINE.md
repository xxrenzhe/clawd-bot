# 自动 SEO 优化流程（数据采集 → 报告）

本文档描述如何实现并运行每日自动化 SEO 优化流程，包括：
1) 每日抓取最新相关内容，更新知识库
2) 每日生成趋势文章（可选）
3) 每日生成内部报告（Markdown，仅基于知识库/新文章）
4) 完整执行步骤与配置说明

---

## 一、总体流程

每日自动化任务由 GitHub Actions 触发（`.github/workflows/seo-automation.yml`），按以下顺序执行：

1. **采集知识库**
   - 脚本：`website/scripts/seo-automation/collect-data.ts`
   - 输出：`website/data/knowledge-base/collected-articles.json`
   - 统计：`website/data/knowledge-base/collection-summary.json`

2. **生成趋势文章（可选但推荐）**
   - 脚本：`website/scripts/seo-automation/generate-trending-articles.ts`
   - 输出：`website/src/content/articles/{slug}.mdx`
   - 记录：`website/data/knowledge-base/generated-articles.json`

3. **生成每日报告（内部 Markdown）**
   - 脚本：`website/scripts/seo-automation/generate-report.ts`
   - 输出：`website/data/reports/YYYY-MM-DD.md`
   - 说明：报告仅保存在仓库内部，不会出现在网站或 Docker 镜像中

---

## 二、知识库数据采集（满足“最新消息/他人文章/用户案例/社交反馈”）

采集来源包括：
- **新闻/快讯**：Google News RSS（关键词：AI assistant / automation / RAG）
- **他人文章**：Dev.to、Medium RSS
- **用户案例/场景**：Medium case-study、GitHub Topics（AI automation/chatbot）
- **社交反馈**：Reddit 热帖

你可以在 `website/scripts/seo-automation/collect-data.ts` 中修改 RSS 列表或关键词过滤逻辑。

---

## 三、每日报告（内部 Markdown）

每天的报告会输出到：

- `website/data/reports/YYYY-MM-DD.md`

该报告仅存放在代码库内部，不会被网站访问到，也不会被打包到镜像里。

查看方式（内部）：
- 直接在仓库中打开 `website/data/reports/YYYY-MM-DD.md`
- CI 运行后，报告会随代码提交进仓库（可在 GitHub/本地查看）

---

## 四、如何运行（本地 / CI）

### 本地手动执行
```bash
cd website
npm run seo:run    # 仅采集 + 文章生成
npm run seo:full   # 采集 + 报告（不生成文章）
npm run seo:all    # 全流程：采集 + 生成 + 图片 + 报告

# 可选：回补某一天的报告
SEO_DATE=2026-02-01 npm run seo:full
```

### GitHub Actions 自动执行
文件：`.github/workflows/seo-automation.yml`
- 默认每天 UTC 06:00 执行
- 可手动触发（workflow_dispatch）
 - 报告输出路径：`website/data/reports/YYYY-MM-DD.md`

---

## 五、常见问题

**Q: 没有生成文章会怎样？**
A: 报告依旧会生成，但“Generated Articles”部分会显示为空。

**Q: 如何扩展采集来源？**
A: 修改 `website/scripts/seo-automation/collect-data.ts` 中的 `RSS_SOURCES` 和关键词。

**Q: 如何改变报告输出目录？**
A: 修改 `website/scripts/seo-automation/generate-report.ts` 中的 `REPORTS_DIR`。

---

如需新增数据源、调整指标或扩展优化规则，建议在 `website/scripts/seo-automation/` 中集中维护。
