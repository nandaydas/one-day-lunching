// ============================================================
// Nimantro — Cloud Functions Plan Limits Helper
// apps/functions/src/lib/plans.ts
// ============================================================

import type { Firestore } from "firebase-admin/firestore";
import type { PlanTier } from "@nimantro/types";

export interface PlanLimits {
  plan: PlanTier;
  maxActiveEvents: number;
  maxGuestGroups: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { plan: "free", maxActiveEvents: 3, maxGuestGroups: 100 },
  event_pro: { plan: "event_pro", maxActiveEvents: 15, maxGuestGroups: 1000 },
  event_business: { plan: "event_business", maxActiveEvents: 100, maxGuestGroups: 10000 },
};

export async function getUserPlanLimits(db: Firestore, uid: string): Promise<PlanLimits> {
  const subSnap = await db.collection("subscriptionAccounts").doc(uid).get();
  const rawPlan = subSnap.exists ? (subSnap.data()?.plan as PlanTier | undefined) : undefined;
  return (rawPlan && PLAN_LIMITS[rawPlan]) ?? PLAN_LIMITS.free;
}
