-- AlterTable
ALTER TABLE "Keyword" ADD COLUMN "competitionScore" REAL;
ALTER TABLE "Keyword" ADD COLUMN "estimatedCpc" REAL;
ALTER TABLE "Keyword" ADD COLUMN "estimatedVolume" INTEGER;
ALTER TABLE "Keyword" ADD COLUMN "revenueScore" REAL;

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "label" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "trackingSlug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "commissionRate" REAL,
    "expectedPayout" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateLink_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "affiliateLinkId" TEXT NOT NULL,
    "postId" TEXT,
    "clickedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referer" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "payout" REAL,
    CONSTRAINT "AffiliateClick_affiliateLinkId_fkey" FOREIGN KEY ("affiliateLinkId") REFERENCES "AffiliateLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AffiliateClick_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MetricsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexed" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "ctr" REAL NOT NULL DEFAULT 0,
    "position" REAL,
    "adImpressions" INTEGER NOT NULL DEFAULT 0,
    "adClicks" INTEGER NOT NULL DEFAULT 0,
    "adCtr" REAL NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "rpm" REAL NOT NULL DEFAULT 0,
    "ecpm" REAL NOT NULL DEFAULT 0,
    "pageRpm" REAL NOT NULL DEFAULT 0,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "source" TEXT,
    CONSTRAINT "MetricsSnapshot_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MetricsSnapshot" ("capturedAt", "clicks", "ctr", "id", "impressions", "indexed", "position", "postId") SELECT "capturedAt", "clicks", "ctr", "id", "impressions", "indexed", "position", "postId" FROM "MetricsSnapshot";
DROP TABLE "MetricsSnapshot";
ALTER TABLE "new_MetricsSnapshot" RENAME TO "MetricsSnapshot";
CREATE INDEX "MetricsSnapshot_postId_capturedAt_idx" ON "MetricsSnapshot"("postId", "capturedAt");
CREATE INDEX "MetricsSnapshot_revenue_idx" ON "MetricsSnapshot"("revenue");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keywordId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDEA',
    "targetCountry" TEXT NOT NULL DEFAULT 'US',
    "assignedWeek" INTEGER,
    "targetPublishDate" DATETIME,
    "draftMarkdown" TEXT,
    "finalHtml" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "faqCount" INTEGER NOT NULL DEFAULT 0,
    "internalLinkCount" INTEGER NOT NULL DEFAULT 0,
    "hasRealExample" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" INTEGER,
    "reviewNotes" TEXT,
    "approvedAt" DATETIME,
    "publishedAt" DATETIME,
    "bloggerPostId" TEXT,
    "bloggerUrl" TEXT,
    "metaDescription" TEXT,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lifetimeImpressions" INTEGER NOT NULL DEFAULT 0,
    "lifetimeClicks" INTEGER NOT NULL DEFAULT 0,
    "lastRevenueAt" DATETIME,
    "refreshScore" REAL,
    "needsRefresh" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("aiScore", "approvedAt", "assignedWeek", "bloggerPostId", "bloggerUrl", "category", "createdAt", "draftMarkdown", "faqCount", "finalHtml", "hasRealExample", "id", "internalLinkCount", "keywordId", "metaDescription", "publishedAt", "reviewNotes", "slug", "status", "targetCountry", "targetPublishDate", "title", "updatedAt", "wordCount") SELECT "aiScore", "approvedAt", "assignedWeek", "bloggerPostId", "bloggerUrl", "category", "createdAt", "draftMarkdown", "faqCount", "finalHtml", "hasRealExample", "id", "internalLinkCount", "keywordId", "metaDescription", "publishedAt", "reviewNotes", "slug", "status", "targetCountry", "targetPublishDate", "title", "updatedAt", "wordCount" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_status_assignedWeek_idx" ON "Post"("status", "assignedWeek");
CREATE INDEX "Post_category_status_idx" ON "Post"("category", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLink_trackingSlug_key" ON "AffiliateLink"("trackingSlug");

-- CreateIndex
CREATE INDEX "AffiliateLink_postId_isActive_idx" ON "AffiliateLink"("postId", "isActive");

-- CreateIndex
CREATE INDEX "AffiliateLink_category_idx" ON "AffiliateLink"("category");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateLinkId_clickedAt_idx" ON "AffiliateClick"("affiliateLinkId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_postId_idx" ON "AffiliateClick"("postId");

-- CreateIndex
CREATE INDEX "Keyword_revenueScore_idx" ON "Keyword"("revenueScore");
