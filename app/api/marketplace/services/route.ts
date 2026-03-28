/**
 * Marketplace 服务列表 API
 * GET /api/marketplace/services
 * 
 * 列出 published 状态的 services，支持搜索/分类/排序/分页
 */

import { NextResponse } from 'next/server';
import { db, services, aiApps } from '@/db';
import { eq } from 'drizzle-orm';
import { sqlite } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'rating';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const conditions: string[] = ["s.status = 'published'"];
    const params: unknown[] = [];

    if (search) {
      conditions.push('s.name LIKE ?');
      params.push(`%${search}%`);
    }

    if (category) {
      conditions.push('a.category = ?');
      params.push(category);
    }

    const whereClause = conditions.join(' AND ');

    // 排序
    let orderClause = 's.rank_weight DESC';
    if (sort === 'usage') {
      orderClause = 's.total_usage_requests DESC';
    } else if (sort === 'newest') {
      orderClause = 's.created_at DESC';
    } else {
      // sort === 'rating'（默认）
      orderClause = 's.average_rating DESC';
    }

    // 总数
    const totalResult = sqlite.prepare(
      `SELECT COUNT(*) as count FROM services s JOIN ai_apps a ON s.ai_app_id = a.id WHERE ${whereClause}`
    ).get(...params) as { count: number };
    const total = totalResult?.count || 0;

    // 列表
    const rows = sqlite.prepare(
      `SELECT s.* FROM services s JOIN ai_apps a ON s.ai_app_id = a.id WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return NextResponse.json({ services: rows, total });
  } catch (error) {
    console.error('[Marketplace Services] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
