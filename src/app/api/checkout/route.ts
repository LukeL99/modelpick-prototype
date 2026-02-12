import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { CHECKOUT_SUCCESS_URL, getCheckoutCancelUrl } from "@/lib/stripe/config";
import { isMockStripe } from "@/lib/debug/mock-config";
import { estimateCost, optimizeRunsForBudget } from "@/lib/wizard/cost-estimator";
import { getModelById } from "@/lib/config/models";
import { API_BUDGET_CEILING, REPORT_PRICE } from "@/lib/config/constants";
import type { BenchmarkDraft } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { draftId, mock } = body as { draftId?: string; mock?: boolean };

    if (!draftId) {
      return NextResponse.json(
        { error: "Missing draftId" },
        { status: 400 }
      );
    }

    // Load and validate draft
    const { data: draft, error: draftError } = await supabase
      .from("benchmark_drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    const typedDraft = draft as BenchmarkDraft;

    if (typedDraft.user_id !== user.id) {
      return NextResponse.json(
        { error: "Draft does not belong to you" },
        { status: 403 }
      );
    }

    if (typedDraft.status !== "ready") {
      return NextResponse.json(
        { error: "Draft is not ready for checkout" },
        { status: 400 }
      );
    }

    // Resolve selected models from draft
    const schemaData = typedDraft.schema_data as Record<string, unknown>;
    const selectedModelIds = (schemaData?.selectedModelIds as string[]) ?? [];
    const uploadData = typedDraft.upload_data as Record<string, unknown>;
    const images = (uploadData?.images as Array<{ path: string }>) ?? [];
    const configData = typedDraft.config_data as Record<string, unknown>;
    const sampleCount = (configData?.sampleCount as number) ?? 3;

    const selectedModels = selectedModelIds
      .map((id) => getModelById(id))
      .filter(Boolean);

    if (selectedModels.length === 0) {
      return NextResponse.json(
        { error: "No valid models selected" },
        { status: 400 }
      );
    }

    // Budget pre-calculation and enforcement
    const costEstimate = estimateCost({
      selectedModels: selectedModels as NonNullable<(typeof selectedModels)[number]>[],
      runsPerModel: sampleCount,
      sampleCount: images.length,
    });

    let runsPerModel = sampleCount;

    if (costEstimate.estimatedCost > API_BUDGET_CEILING) {
      // Try to optimize runs to fit within budget
      const optimizedRuns = optimizeRunsForBudget(
        selectedModels as NonNullable<(typeof selectedModels)[number]>[],
        images.length
      );

      if (optimizedRuns < 1) {
        return NextResponse.json(
          {
            error: "budget_exceeded",
            message:
              "This configuration exceeds the budget even at minimum runs. Please reduce the number of models or images.",
            modelCount: selectedModels.length,
            imageCount: images.length,
          },
          { status: 400 }
        );
      }

      runsPerModel = optimizedRuns;
      console.log(
        `[checkout] Budget optimization: reduced runs from ${sampleCount} to ${runsPerModel} for ${selectedModels.length} models x ${images.length} images`
      );
    }

    // Mock Stripe mode
    if (mock && isMockStripe()) {
      const admin = createAdminClient();

      // Build config snapshot
      const configSnapshot = {
        ...configData,
        sampleCount: runsPerModel, // Use optimized runs if applicable
        selected_models: selectedModelIds,
        schema_data: schemaData,
        upload_data: uploadData,
      };

      const shareToken = nanoid(22);
      const fakeSessionId = `mock_${nanoid()}`;

      const { data: report, error: reportError } = await admin
        .from("reports")
        .insert({
          user_id: user.id,
          draft_id: draftId,
          stripe_session_id: fakeSessionId,
          status: "paid",
          share_token: shareToken,
          config_snapshot: configSnapshot,
          image_paths: images.map((img) => img.path),
          extraction_prompt: (schemaData?.prompt as string) ?? "",
          json_schema:
            (schemaData?.userSchema
              ? JSON.parse(schemaData.userSchema as string)
              : (schemaData?.inferredSchema as Record<string, unknown>)) ?? {},
          model_count: selectedModels.length,
        })
        .select("id")
        .single();

      if (reportError) {
        console.error("[checkout] Mock report creation failed:", reportError);
        return NextResponse.json(
          { error: "Failed to create report" },
          { status: 500 }
        );
      }

      // Update draft status to paid
      await admin
        .from("benchmark_drafts")
        .update({ status: "paid" })
        .eq("id", draftId);

      return NextResponse.json({ reportId: report.id });
    }

    // Real Stripe checkout
    const stripeClient = getStripe();
    if (!stripeClient) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      client_reference_id: draftId,
      metadata: {
        draft_id: draftId,
        user_id: user.id,
        ...(runsPerModel !== sampleCount
          ? { optimized_runs_per_model: String(runsPerModel) }
          : {}),
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "ModelBlitz Benchmark Report",
              description: `Benchmark ${selectedModels.length} vision models across ${images.length} images`,
            },
            unit_amount: Math.round(REPORT_PRICE * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: CHECKOUT_SUCCESS_URL,
      cancel_url: getCheckoutCancelUrl(draftId),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
