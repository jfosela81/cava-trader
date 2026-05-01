import { NextResponse } from 'next/server';
import { getSP500Price } from '@/lib/twelvedata';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const price = await getSP500Price();
    return NextResponse.json({ success: true, data: price });
  } catch (error) {
    console.error('Error fetching SP500 price:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market price' },
      { status: 500 }
    );
  }
}
