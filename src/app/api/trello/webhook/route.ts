// ============================================================
// Trello Webhook Receiver — POST /api/trello/webhook
// Receives Trello webhook events and syncs changes back.
// This endpoint is UNPROTECTED (called by Trello servers).
// Trello sends a HEAD request for verification, then POST for events.
// ============================================================

import { NextResponse } from "next/server";
import { db as prismaDb } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-utils";
import * as Sync from "@/lib/trello-sync";
import * as Trello from "@/lib/trello-client";

const db = prismaDb as any;

// Trello sends a HEAD request when creating a webhook to verify the URL.
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// POST — handle incoming webhook events from Trello
export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();

  const action = body?.action;
  if (!action) {
    return NextResponse.json(
      { message: "No action in payload (likely a test ping)" },
      { status: 200 },
    );
  }

  const actionType: string = action.type || "";
  const boardId: string = action.data?.board?.id || body?.model?.id || "";

  if (!boardId) {
    return NextResponse.json(
      { error: "No board ID found in webhook payload" },
      { status: 400 },
    );
  }

  // Find all integrations using this board
  const integrations = await db.trelloIntegration.findMany({
    where: { boardId, enabled: true },
  });

  if (integrations.length === 0) {
    return NextResponse.json(
      { message: "No matching integration found" },
      { status: 200 },
    );
  }

  const cardData = action.data?.card;
  const cardId: string | undefined = cardData?.id;

  for (const integration of integrations) {
    // Only process incoming changes if direction allows it
    if (integration.syncDirection === "to_trello") continue;

    if (!cardId) continue;

    try {
      const auth = {
        apiKey: integration.trelloApiKey,
        token: integration.trelloToken,
      };

      switch (actionType) {
        case "createCard":
        case "updateCard":
        case "moveCard": {
          // Fetch the latest card state
          const card = await Trello.getCard(auth, cardId);
          // Apply to TeamFlow
          await Sync.pullCardUpdateToTask(card, integration);
          break;
        }
        case "deleteCard":
        case "emailCard": {
          await db.trelloSyncLog.create({
            data: {
              integrationId: integration.id,
              direction: "from_trello",
              action: "deleted",
              trelloCardId: cardId,
              status: "success",
              details: `Trello card ${cardId} was deleted or archived`,
            },
          });
          break;
        }
        default:
          // Ignore other action types (comments, etc.)
          break;
      }
    } catch (err) {
      console.error(
        `[Trello Webhook] Error processing ${actionType} for integration ${integration.id}:`,
        err,
      );
    }
  }

  return NextResponse.json({ received: true });
});
