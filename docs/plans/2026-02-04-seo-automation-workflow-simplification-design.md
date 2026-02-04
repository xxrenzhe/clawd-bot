# SEO Automation Workflow Simplification Design

**Date:** 2026-02-04

## Goal
Remove the analytics collection and analysis steps from the SEO automation workflow while keeping content collection, article generation, images, and a lightweight report that reflects only knowledge-base updates and generated articles.

## Non-Goals
- Do not delete analytics/analyze scripts; they can remain for potential future use.
- Do not change the knowledge base collection logic or article generation logic.
- Do not add new analytics providers or data sources.

## Approach Summary
1. **Workflow execution**: Update npm scripts so the default workflow no longer calls analytics collection or analysis. `seo:full` becomes “collect + report (knowledge-base only)”, and `seo:all` becomes “collect + generate articles + images + report”.
2. **Report generation**: Make the report independent of analysis data. It will use knowledge-base summary (`data/knowledge-base/collection-summary.json`) and the generated articles log (`data/knowledge-base/generated-articles.json`). The report will include:
   - Knowledge Base Updates (existing metrics)
   - Generated Articles (count + list of slugs; optional titles if easily read from MDX)
3. **Documentation**: Update `docs/SEO-AUTOMATION-PIPELINE.md` to remove the analytics collection and analysis steps, delete sections describing analytics/analysis/Plausible, and revise the “how to run” commands accordingly.

## Data Flow
- Input: `collect-data.ts` → `collection-summary.json` and `collected-articles.json`.
- Input: `generate-trending-articles.ts` → `generated-articles.json` and new MDX in `src/content/articles/`.
- Report: `generate-report.ts` reads only knowledge-base files; no dependency on `data/analytics` or `data/analysis`.

## Rollback Plan
Re-add analytics/analyze steps to `seo:full` and `seo:all`, and reintroduce analysis-based report sections by restoring report logic to read `data/analysis/YYYY-MM-DD.json`.
