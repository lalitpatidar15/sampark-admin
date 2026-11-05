export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'sampark-admin',
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
}