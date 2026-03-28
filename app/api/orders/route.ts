/**
 * 订单/使用记录查询 API
 * GET /api/orders?consumerId=xxx&tab=orders|usage
 */
import { NextResponse } from 'next/server';
import { db, consumers } from '@/db';
import { serviceOrders, serviceUsages, services } from '@/core/db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import { LocalAuthAdapter } from '@/src/core/adapters/auth/local-auth-adapter';

export const dynamic = 'force-dynamic';
const auth = new LocalAuthAdapter();

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await auth.verifyToken(token);
    if (!payload || (payload as Record<string, unknown>).type !== 'consumer' || !(payload as Record<string, unknown>).sub) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const consumerId = (payload as Record<string, unknown>).sub as string;
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'orders';
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    // 检查 consumer 存在
    const [consumer] = await db.select({ id: consumers.id }).from(consumers).where(eq(consumers.id, consumerId)).limit(1);
    if (!consumer) {
      return NextResponse.json({ error: 'Consumer not found' }, { status: 404 });
    }

    if (tab === 'usage') {
      // 查询使用记录
      const usageList = await db
        .select({
          id: serviceUsages.id,
          serviceId: serviceUsages.serviceId,
          tokenCount: serviceUsages.tokenCount,
          requestCount: serviceUsages.requestCount,
          createdAt: serviceUsages.createdAt,
        })
        .from(serviceUsages)
        .where(eq(serviceUsages.consumerId, consumerId))
        .orderBy(desc(serviceUsages.createdAt))
        .limit(limit)
        .offset(offset);

      // 关联服务名称
      const serviceIds = [...new Set(usageList.map(u => u.serviceId))];
      const serviceMap = new Map<string, string>();
      if (serviceIds.length > 0) {
        const serviceList = await db.select({ id: services.id, name: services.name }).from(services);
        serviceList.forEach(s => serviceMap.set(s.id, s.name));
      }

      const enriched = usageList.map(u => ({
        ...u,
        serviceName: serviceMap.get(u.serviceId) ?? 'Unknown',
      }));

      return NextResponse.json({ data: enriched });
    }

    // 查询订单列表（默认）
    const orderList = await db
      .select({
        id: serviceOrders.id,
        serviceId: serviceOrders.serviceId,
        status: serviceOrders.status,
        amount: serviceOrders.amount,
        paymentMethod: serviceOrders.paymentMethod,
        createdAt: serviceOrders.createdAt,
      })
      .from(serviceOrders)
      .where(eq(serviceOrders.consumerId, consumerId))
      .orderBy(desc(serviceOrders.createdAt))
      .limit(limit)
      .offset(offset);

    // 关联服务名称
    const orderServiceIds = [...new Set(orderList.map(o => o.serviceId))];
    const orderServiceMap = new Map<string, string>();
    if (orderServiceIds.length > 0) {
      const serviceList = await db.select({ id: services.id, name: services.name }).from(services);
      serviceList.forEach(s => orderServiceMap.set(s.id, s.name));
    }

    const enrichedOrders = orderList.map(o => ({
      ...o,
      serviceName: orderServiceMap.get(o.serviceId) ?? 'Unknown',
    }));

    return NextResponse.json({ data: enrichedOrders });
  } catch (error) {
    console.error('[Orders] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
