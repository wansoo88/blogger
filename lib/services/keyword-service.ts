import { Category, Country, KeywordStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  computeKeywordRevenueScore,
  getCategoryDefaults,
} from "@/lib/services/keyword-score-service";

type CreateKeywordInput = {
  keyword: string;
  category: Category;
  country: Country;
  intent: string;
  priority: number;
  notes?: string;
  estimatedCpc?: number | null;
  competitionScore?: number | null;
  estimatedVolume?: number | null;
};

export async function createKeyword(input: CreateKeywordInput) {
  const defaults = getCategoryDefaults(input.category);
  const cpc =
    typeof input.estimatedCpc === "number" && !Number.isNaN(input.estimatedCpc)
      ? input.estimatedCpc
      : defaults.cpc;
  const competition =
    typeof input.competitionScore === "number" &&
    !Number.isNaN(input.competitionScore)
      ? input.competitionScore
      : defaults.competition;
  const volume =
    typeof input.estimatedVolume === "number" &&
    !Number.isNaN(input.estimatedVolume)
      ? input.estimatedVolume
      : null;

  const revenueScore = computeKeywordRevenueScore({
    priority: input.priority,
    intent: input.intent,
    category: input.category,
    estimatedCpc: cpc,
    competitionScore: competition,
    estimatedVolume: volume,
  });

  return db.keyword.create({
    data: {
      keyword: input.keyword,
      category: input.category,
      country: input.country,
      intent: input.intent,
      priority: input.priority,
      notes: input.notes,
      estimatedCpc: cpc,
      competitionScore: competition,
      estimatedVolume: volume,
      revenueScore,
      status: KeywordStatus.QUEUED,
    },
  });
}

export async function listKeywords() {
  return db.keyword.findMany({
    orderBy: [
      { revenueScore: "desc" },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      posts: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}
