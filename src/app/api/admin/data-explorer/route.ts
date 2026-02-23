import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const ADMIN_EMAIL = "orenrittenberg@gmail.com";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const rows = await db.execute(
    sql`SELECT email FROM users WHERE id = ${session.user.id} LIMIT 1`
  );
  const userRows = rows as unknown as { email: string }[];
  if (!userRows[0] || userRows[0].email !== ADMIN_EMAIL) return null;
  return session.user.id;
}

export async function GET(request: NextRequest) {
  const userId = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const source = request.nextUrl.searchParams.get("source");
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50"),
    200
  );
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const layer = request.nextUrl.searchParams.get("layer");

  switch (source) {
    case "overview": {
      const [
        signalCounts,
        userCount,
        briefingCount,
        feedCount,
        newsQueryCount,
        newsletterCount,
        knowledgeCount,
        feedbackCount,
        pipelineCount,
      ] = await Promise.all([
        db.execute(sql`
          SELECT layer, COUNT(*) as count
          FROM signals
          GROUP BY layer
          ORDER BY count DESC
        `),
        db.execute(sql`SELECT COUNT(*) as count FROM users`),
        db.execute(sql`SELECT COUNT(*) as count FROM briefings`),
        db.execute(sql`SELECT COUNT(*) as count FROM syndication_feeds`),
        db.execute(sql`SELECT COUNT(*) as count FROM news_queries`),
        db.execute(sql`SELECT COUNT(*) as count FROM newsletter_registry`),
        db.execute(sql`SELECT COUNT(*) as count FROM knowledge_entities`),
        db.execute(sql`SELECT COUNT(*) as count FROM feedback_signals`),
        db.execute(sql`SELECT COUNT(*) as count FROM pipeline_runs`),
      ]);

      return NextResponse.json({
        signalsByLayer: signalCounts,
        users: (userCount as unknown as { count: number }[])[0]?.count ?? 0,
        briefings:
          (briefingCount as unknown as { count: number }[])[0]?.count ?? 0,
        feeds: (feedCount as unknown as { count: number }[])[0]?.count ?? 0,
        newsQueries:
          (newsQueryCount as unknown as { count: number }[])[0]?.count ?? 0,
        newsletters:
          (newsletterCount as unknown as { count: number }[])[0]?.count ?? 0,
        knowledgeEntities:
          (knowledgeCount as unknown as { count: number }[])[0]?.count ?? 0,
        feedbackSignals:
          (feedbackCount as unknown as { count: number }[])[0]?.count ?? 0,
        pipelineRuns:
          (pipelineCount as unknown as { count: number }[])[0]?.count ?? 0,
      });
    }

    case "signals": {
      const layerFilter = layer
        ? sql`WHERE s.layer = ${layer}`
        : sql`WHERE TRUE`;
      const rows = await db.execute(sql`
        SELECT s.id, s.layer, s.source_url, s.title, s.summary,
               s.metadata, s.published_at, s.ingested_at,
               LEFT(s.content, 500) as content_preview
        FROM signals s
        ${layerFilter}
        ORDER BY s.ingested_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const total = await db.execute(sql`
        SELECT COUNT(*) as count FROM signals s ${layerFilter}
      `);
      return NextResponse.json({
        rows,
        total: (total as unknown as { count: number }[])[0]?.count ?? 0,
      });
    }

    case "signals-detail": {
      const id = request.nextUrl.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const rows = await db.execute(sql`
        SELECT s.*, 
               LEFT(s.content, 5000) as content_trimmed
        FROM signals s
        WHERE s.id = ${id}::uuid
        LIMIT 1
      `);
      const provenance = await db.execute(sql`
        SELECT sp.*, u.email, u.name as user_name
        FROM signal_provenance sp
        LEFT JOIN users u ON u.id = sp.user_id
        WHERE sp.signal_id = ${id}::uuid
      `);
      return NextResponse.json({ signal: (rows as unknown as unknown[])[0], provenance });
    }

    case "news-queries": {
      const rows = await db.execute(sql`
        SELECT nq.*, nps.last_polled_at, nps.result_count,
               nps.consecutive_errors, nps.last_error_message, nps.next_poll_at,
               u.email, u.name as user_name
        FROM news_queries nq
        LEFT JOIN news_poll_state nps ON nps.query_id = nq.id
        LEFT JOIN users u ON u.id = nq.user_id
        ORDER BY nq.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "syndication-feeds": {
      const rows = await db.execute(sql`
        SELECT sf.*,
               (SELECT COUNT(*) FROM user_feed_subscriptions ufs WHERE ufs.feed_id = sf.id) as subscriber_count
        FROM syndication_feeds sf
        ORDER BY sf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "newsletters": {
      const rows = await db.execute(sql`
        SELECT nr.*,
               (SELECT COUNT(*) FROM user_newsletter_subscriptions uns WHERE uns.newsletter_id = nr.id) as subscriber_count
        FROM newsletter_registry nr
        ORDER BY nr.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "knowledge-graph": {
      const rows = await db.execute(sql`
        SELECT ke.id, ke.user_id, ke.entity_type, ke.name, ke.description,
               ke.source, ke.confidence, ke.known_since, ke.last_reinforced,
               u.email, u.name as user_name
        FROM knowledge_entities ke
        LEFT JOIN users u ON u.id = ke.user_id
        ORDER BY ke.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      const edges = await db.execute(sql`
        SELECT kedge.id, kedge.relationship,
               src.name as source_name, src.entity_type as source_type,
               tgt.name as target_name, tgt.entity_type as target_type
        FROM knowledge_edges kedge
        LEFT JOIN knowledge_entities src ON src.id = kedge.source_entity_id
        LEFT JOIN knowledge_entities tgt ON tgt.id = kedge.target_entity_id
        ORDER BY kedge.id DESC
        LIMIT ${limit}
      `);
      return NextResponse.json({ entities: rows, edges });
    }

    case "briefings": {
      const rows = await db.execute(sql`
        SELECT b.id, b.user_id, b.items, b.model_used,
               b.prompt_tokens, b.completion_tokens, b.generated_at,
               u.email, u.name as user_name
        FROM briefings b
        LEFT JOIN users u ON u.id = b.user_id
        ORDER BY b.generated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "feedback": {
      const rows = await db.execute(sql`
        SELECT fs.*, u.email, u.name as user_name
        FROM feedback_signals fs
        LEFT JOIN users u ON u.id = fs.user_id
        ORDER BY fs.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "users": {
      const rows = await db.execute(sql`
        SELECT u.id, u.email, u.name, u.title, u.company,
               u.linkedin_url, u.onboarding_status, u.created_at,
               up.parsed_initiatives, up.parsed_concerns, up.parsed_topics,
               up.parsed_knowledge_gaps, up.parsed_expert_areas, up.parsed_weak_areas,
               up.rapid_fire_classifications, up.delivery_channel, up.delivery_time,
               up.delivery_timezone,
               up.conversation_input_method,
               LEFT(up.conversation_transcript, 1000) as transcript_preview
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "impress-contacts": {
      const rows = await db.execute(sql`
        SELECT ic.*, u.email, u.name as user_name
        FROM impress_contacts ic
        LEFT JOIN users u ON u.id = ic.user_id
        ORDER BY ic.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "peer-orgs": {
      const rows = await db.execute(sql`
        SELECT po.*, u.email, u.name as user_name
        FROM peer_organizations po
        LEFT JOIN users u ON u.id = po.user_id
        ORDER BY po.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "pipeline-runs": {
      const rows = await db.execute(sql`
        SELECT pr.*, u.email, u.name as user_name
        FROM pipeline_runs pr
        LEFT JOIN users u ON u.id = pr.user_id
        ORDER BY pr.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "pipeline-stages": {
      const runId = request.nextUrl.searchParams.get("runId");
      if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
      const rows = await db.execute(sql`
        SELECT ps.*
        FROM pipeline_stages ps
        WHERE ps.run_id = ${runId}::uuid
        ORDER BY ps.started_at ASC
      `);
      return NextResponse.json({ rows });
    }

    case "email-forwards": {
      const rows = await db.execute(sql`
        SELECT ef.id, ef.user_id, ef.sender_email, ef.subject,
               ef.user_annotation, ef.original_sender, ef.extracted_urls,
               ef.primary_url, ef.signal_id, ef.received_at, ef.processed_at,
               LEFT(ef.forwarded_content, 500) as content_preview,
               u.email, u.name as user_name
        FROM email_forwards ef
        LEFT JOIN users u ON u.id = ef.user_id
        ORDER BY ef.received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    case "provenance": {
      const rows = await db.execute(sql`
        SELECT sp.*, s.title as signal_title, s.layer as signal_layer,
               u.email, u.name as user_name
        FROM signal_provenance sp
        LEFT JOIN signals s ON s.id = sp.signal_id
        LEFT JOIN users u ON u.id = sp.user_id
        ORDER BY sp.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      return NextResponse.json({ rows });
    }

    default:
      return NextResponse.json(
        { error: `Unknown source: ${source}` },
        { status: 400 }
      );
  }
}
