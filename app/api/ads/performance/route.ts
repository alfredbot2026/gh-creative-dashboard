import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const structureSlug = searchParams.get('structure_slug');
  const hookType = searchParams.get('hook_type');
  const minRoas = parseFloat(searchParams.get('min_roas') || '0');
  const groupBy = searchParams.get('group_by'); // 'ad' | 'structure' | 'hook' | 'topic'

  try {
    let query = supabase
      .from('ad_performance')
      .select(`
        *,
        content_items (
          title,
          hook_type,
          structure_slug,
          content_goal,
          topic
        )
      `)
      .eq('user_id', user.id);

    if (dateFrom) query = query.gte('date_start', dateFrom);
    if (dateTo) query = query.lte('date_stop', dateTo);
    if (structureSlug) query = query.eq('structure_slug', structureSlug);
    if (hookType) query = query.eq('hook_type', hookType);
    if (minRoas > 0) query = query.gte('roas', minRoas);

    const { data, error } = await query;

    if (error) {
      console.error('[Performance API] Query error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
    }

    if (groupBy && ['ad', 'structure', 'hook', 'topic'].includes(groupBy)) {
        // Simple aggregation logic (can be refined based on needs)
        const aggregated = data.reduce((acc: any, row: any) => {
            const key = row[groupBy] || row.content_items?.[groupBy] || 'Unknown';
            if (!acc[key]) {
                acc[key] = {
                    key,
                    spend: 0,
                    impressions: 0,
                    clicks: 0,
                    conversions: 0,
                    conversion_value: 0,
                    count: 0
                };
            }
            acc[key].spend += row.spend || 0;
            acc[key].impressions += row.impressions || 0;
            acc[key].clicks += row.clicks || 0;
            acc[key].conversions += row.conversions || 0;
            acc[key].conversion_value += row.conversion_value || 0;
            acc[key].count += 1;
            return acc;
        }, {});

        const result = Object.values(aggregated).map((item: any) => ({
            ...item,
            ctr: item.impressions > 0 ? item.clicks / item.impressions : 0,
            roas: item.spend > 0 ? item.conversion_value / item.spend : 0,
            cpa: item.conversions > 0 ? item.spend / item.conversions : 0
        }));

        return NextResponse.json({ data: result });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[Performance API] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
