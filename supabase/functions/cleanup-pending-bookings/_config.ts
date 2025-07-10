export const config = {
  name: 'cleanup-pending-bookings',
  description: 'Automatically deletes pending bookings older than 48 hours',
  schedule: '0 2 * * *', // Run daily at 2 AM UTC
  timeout: 300, // 5 minutes timeout
  memory: 256, // 256 MB memory limit
  environment: {
    SUPABASE_URL: '{{SUPABASE_URL}}',
    SUPABASE_SERVICE_ROLE_KEY: '{{SUPABASE_SERVICE_ROLE_KEY}}'
  }
} 