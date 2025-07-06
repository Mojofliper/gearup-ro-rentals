# Admin Guide - GearUp Platform

## 👨‍💼 Overview

This guide provides comprehensive instructions for administrators managing the GearUp platform. Admin functions include user management, content moderation, dispute resolution, analytics, and platform maintenance.

**⚠️ IMPORTANT NOTE**: This admin guide describes planned features and functionality. The admin dashboard and most admin features are not yet implemented and are planned for Phase 3 of development (Weeks 5-6). The current implementation focuses on core user features and payment system completion.

---

## 🔐 Admin Authentication

### 1. Admin Access

#### Admin Role Assignment
```sql
-- Grant admin role to user
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';
```

#### Admin Login
1. **Standard Login**: Use regular user login
2. **Role Verification**: System checks for admin role
3. **Admin Dashboard**: Redirected to admin interface
4. **Session Management**: Extended session for admin tasks

### 2. Admin Permissions

#### Permission Matrix
```typescript
const adminPermissions = {
  user_management: {
    view_all_users: true,
    edit_user_profiles: true,
    suspend_users: true,
    delete_users: true,
    verify_users: true
  },
  content_moderation: {
    review_gear_listings: true,
    approve_reviews: true,
    remove_content: true,
    flag_inappropriate: true
  },
  dispute_resolution: {
    view_all_claims: true,
    resolve_disputes: true,
    adjust_deposits: true,
    issue_refunds: true
  },
  analytics: {
    view_platform_metrics: true,
    export_data: true,
    generate_reports: true
  },
  system_management: {
    view_logs: true,
    manage_categories: true,
    system_configuration: true
  }
}
```

---

## 👥 User Management

### 1. User Overview

#### User Dashboard
```typescript
// Admin user management interface
interface UserManagement {
  total_users: number
  active_users: number
  verified_users: number
  suspended_users: number
  new_users_today: number
  new_users_this_week: number
  new_users_this_month: number
}
```

#### User Search and Filter
- **Search by**: Name, email, phone, location
- **Filter by**: Role, verification status, activity status
- **Sort by**: Registration date, last activity, rating
- **Export**: CSV export of user data

### 2. User Actions

#### User Verification
```typescript
// Verify user account
const verifyUser = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', userId)
  
  if (error) throw error
  
  // Send verification email
  await sendVerificationEmail(userId)
  
  // Log admin action
  await logAdminAction('user_verified', userId)
}
```

#### User Suspension
```typescript
// Suspend user account
const suspendUser = async (userId: string, reason: string, duration: number) => {
  const suspensionData = {
    user_id: userId,
    reason: reason,
    suspended_until: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    suspended_by: adminId,
    created_at: new Date().toISOString()
  }
  
  // Create suspension record
  await supabase
    .from('user_suspensions')
    .insert(suspensionData)
  
  // Update user status
  await supabase
    .from('profiles')
    .update({ is_suspended: true })
    .eq('id', userId)
  
  // Notify user
  await sendSuspensionEmail(userId, reason, duration)
}
```

#### User Deletion
```typescript
// Delete user account (GDPR compliance)
const deleteUser = async (userId: string, reason: string) => {
  // Anonymize user data instead of deletion
  const anonymizedData = {
    full_name: 'Deleted User',
    email: `deleted_${userId}@gearup.ro`,
    phone: null,
    avatar_url: null,
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deletion_reason: reason
  }
  
  // Update profile
  await supabase
    .from('profiles')
    .update(anonymizedData)
    .eq('id', userId)
  
  // Archive user data
  await archiveUserData(userId)
  
  // Log deletion
  await logAdminAction('user_deleted', userId, { reason })
}
```

### 3. User Analytics

#### User Metrics
```sql
-- User growth metrics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users
FROM profiles 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- User activity metrics
SELECT 
  p.id,
  p.full_name,
  p.created_at,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT g.id) as total_listings,
  AVG(r.rating) as avg_rating
FROM profiles p
LEFT JOIN bookings b ON p.id = b.renter_id OR p.id = b.owner_id
LEFT JOIN gear g ON p.id = g.owner_id
LEFT JOIN reviews r ON p.id = r.reviewed_id
GROUP BY p.id, p.full_name, p.created_at
ORDER BY total_bookings DESC;
```

---

## 📝 Content Moderation

### 1. Gear Listing Moderation

#### Moderation Queue
```typescript
// Get pending gear listings for moderation
const getPendingListings = async () => {
  const { data, error } = await supabase
    .from('gear')
    .select(`
      *,
      profiles!owner_id(full_name, email, is_verified),
      categories(name)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false })
  
  return data || []
}
```

#### Moderation Actions
```typescript
// Approve gear listing
const approveListing = async (gearId: string, adminId: string) => {
  await supabase
    .from('gear')
    .update({ 
      moderation_status: 'approved',
      moderated_by: adminId,
      moderated_at: new Date().toISOString()
    })
    .eq('id', gearId)
  
  // Notify owner
  await notifyOwner(gearId, 'listing_approved')
}

// Reject gear listing
const rejectListing = async (gearId: string, reason: string, adminId: string) => {
  await supabase
    .from('gear')
    .update({ 
      moderation_status: 'rejected',
      moderation_reason: reason,
      moderated_by: adminId,
      moderated_at: new Date().toISOString()
    })
    .eq('id', gearId)
  
  // Notify owner
  await notifyOwner(gearId, 'listing_rejected', { reason })
}
```

#### Content Guidelines
- **Appropriate Content**: No inappropriate or offensive content
- **Accurate Information**: Honest and accurate descriptions
- **Quality Photos**: Clear, high-quality images
- **Reasonable Pricing**: Fair and competitive pricing
- **Complete Information**: All required fields filled

### 2. Review Moderation

#### Review Moderation Process
```typescript
// Get flagged reviews
const getFlaggedReviews = async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles!reviewer_id(full_name, email),
      profiles!reviewed_id(full_name, email),
      gear(name)
    `)
    .eq('moderation_status', 'flagged')
    .order('created_at', { ascending: false })
  
  return data || []
}

// Moderate review
const moderateReview = async (reviewId: string, action: 'approve' | 'reject', reason?: string) => {
  const moderationData = {
    moderation_status: action,
    moderation_reason: reason,
    moderated_by: adminId,
    moderated_at: new Date().toISOString()
  }
  
  await supabase
    .from('reviews')
    .update(moderationData)
    .eq('id', reviewId)
}
```

### 3. Message Moderation

#### Message Monitoring
```typescript
// Monitor messages for inappropriate content
const monitorMessages = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles!sender_id(full_name, email),
      bookings(gear(name))
    `)
    .eq('moderation_status', 'flagged')
    .order('created_at', { ascending: false })
  
  return data || []
}
```

---

## ⚖️ Dispute Resolution

### 1. Claim Management

#### Claims Dashboard
```typescript
interface ClaimsDashboard {
  total_claims: number
  pending_claims: number
  resolved_claims: number
  average_resolution_time: number
  claims_by_type: {
    damage: number
    late_return: number
    missing_item: number
    other: number
  }
}
```

#### Claim Review Process
```typescript
// Get claim details
const getClaimDetails = async (claimId: string) => {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      bookings(
        gear(name, images),
        profiles!renter_id(full_name, email),
        profiles!owner_id(full_name, email)
      ),
      profiles!claimant_id(full_name, email),
      photo_uploads(*)
    `)
    .eq('id', claimId)
    .single()
  
  return data
}

// Resolve claim
const resolveClaim = async (claimId: string, resolution: string, depositPenalty: number) => {
  const resolutionData = {
    status: 'resolved',
    resolution: resolution,
    deposit_penalty: depositPenalty,
    admin_id: adminId,
    resolved_at: new Date().toISOString()
  }
  
  await supabase
    .from('claims')
    .update(resolutionData)
    .eq('id', claimId)
  
  // Process deposit penalty
  if (depositPenalty > 0) {
    await processDepositPenalty(claimId, depositPenalty)
  }
  
  // Notify parties
  await notifyClaimResolution(claimId, resolution)
}
```

### 2. Dispute Resolution Guidelines

#### Resolution Principles
- **Fair Assessment**: Evaluate evidence objectively
- **Communication**: Contact both parties for clarification
- **Documentation**: Review all photos and messages
- **Timely Resolution**: Resolve within 48-72 hours
- **Consistent Standards**: Apply consistent resolution criteria

#### Resolution Options
- **Full Deposit Return**: No fault found
- **Partial Penalty**: Minor issues (25-50% of deposit)
- **Full Penalty**: Significant damage/misuse (100% of deposit)
- **Additional Charges**: Beyond deposit amount

---

## 📊 Analytics and Reporting

### 1. Platform Analytics

#### Key Metrics Dashboard
```typescript
interface PlatformMetrics {
  // User metrics
  total_users: number
  active_users_30d: number
  new_users_30d: number
  user_growth_rate: number
  
  // Transaction metrics
  total_bookings: number
  total_revenue: number
  average_booking_value: number
  booking_success_rate: number
  
  // Equipment metrics
  total_listings: number
  active_listings: number
  average_listing_price: number
  popular_categories: Array<{name: string, count: number}>
  
  // Financial metrics
  platform_revenue: number
  stripe_fees: number
  net_revenue: number
  revenue_growth: number
}
```

#### Revenue Analytics
```sql
-- Monthly revenue breakdown
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_transactions,
  SUM(amount) as total_revenue,
  SUM(platform_fee) as platform_revenue,
  AVG(amount) as average_transaction
FROM transactions 
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Revenue by category
SELECT 
  c.name as category,
  COUNT(t.id) as transactions,
  SUM(t.amount) as total_revenue,
  AVG(t.amount) as average_revenue
FROM transactions t
JOIN bookings b ON t.booking_id = b.id
JOIN gear g ON b.gear_id = g.id
JOIN categories c ON g.category_id = c.id
WHERE t.status = 'completed'
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;
```

### 2. User Behavior Analytics

#### User Activity Tracking
```sql
-- User engagement metrics
SELECT 
  p.id,
  p.full_name,
  p.created_at,
  COUNT(DISTINCT b.id) as bookings_made,
  COUNT(DISTINCT g.id) as listings_created,
  COUNT(DISTINCT r.id) as reviews_given,
  COUNT(DISTINCT m.id) as messages_sent,
  MAX(b.created_at) as last_activity
FROM profiles p
LEFT JOIN bookings b ON p.id = b.renter_id
LEFT JOIN gear g ON p.id = g.owner_id
LEFT JOIN reviews r ON p.id = r.reviewer_id
LEFT JOIN messages m ON p.id = m.sender_id
GROUP BY p.id, p.full_name, p.created_at
ORDER BY last_activity DESC;
```

#### Conversion Funnel
```typescript
// Track user conversion funnel
const conversionFunnel = {
  registered_users: 1000,
  verified_users: 800,
  created_listings: 400,
  made_bookings: 300,
  completed_transactions: 250,
  left_reviews: 200
}

const conversionRates = {
  verification_rate: (conversionFunnel.verified_users / conversionFunnel.registered_users) * 100,
  listing_rate: (conversionFunnel.created_listings / conversionFunnel.verified_users) * 100,
  booking_rate: (conversionFunnel.made_bookings / conversionFunnel.verified_users) * 100,
  completion_rate: (conversionFunnel.completed_transactions / conversionFunnel.made_bookings) * 100
}
```

### 3. Report Generation

#### Automated Reports
```typescript
// Generate daily report
const generateDailyReport = async () => {
  const report = {
    date: new Date().toISOString().split('T')[0],
    new_users: await getNewUsersCount(),
    new_bookings: await getNewBookingsCount(),
    new_listings: await getNewListingsCount(),
    revenue: await getDailyRevenue(),
    disputes: await getNewDisputesCount(),
    system_issues: await getSystemIssues()
  }
  
  // Send report to admin team
  await sendDailyReport(report)
  
  // Store report in database
  await storeReport(report)
}

// Generate monthly report
const generateMonthlyReport = async () => {
  const report = {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    user_growth: await getUserGrowth(),
    revenue_growth: await getRevenueGrowth(),
    top_performers: await getTopPerformers(),
    category_analysis: await getCategoryAnalysis(),
    dispute_summary: await getDisputeSummary()
  }
  
  await sendMonthlyReport(report)
}
```

---

## 🔧 System Management

### 1. System Monitoring

#### Performance Monitoring
```typescript
// Monitor system performance
const systemMetrics = {
  // Database performance
  database_connections: number,
  slow_queries: number,
  query_response_time: number,
  
  // Application performance
  api_response_time: number,
  error_rate: number,
  uptime_percentage: number,
  
  // Payment system
  payment_success_rate: number,
  webhook_delivery_rate: number,
  stripe_api_errors: number
}
```

#### Error Monitoring
```typescript
// Monitor system errors
const monitorErrors = async () => {
  const { data: errors } = await supabase
    .from('error_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
  
  // Group errors by type
  const errorSummary = errors?.reduce((acc, error) => {
    acc[error.error_type] = (acc[error.error_type] || 0) + 1
    return acc
  }, {})
  
  // Alert if error rate is high
  if (errors && errors.length > 100) {
    await sendErrorAlert(errorSummary)
  }
}
```

### 2. Category Management

#### Category Operations
```typescript
// Add new category
const addCategory = async (categoryData: {
  name: string,
  slug: string,
  description: string,
  icon_name: string
}) => {
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Update category
const updateCategory = async (categoryId: string, updates: any) => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Delete category (with safety checks)
const deleteCategory = async (categoryId: string) => {
  // Check if category has active listings
  const { data: activeListings } = await supabase
    .from('gear')
    .select('id')
    .eq('category_id', categoryId)
    .eq('is_available', true)
  
  if (activeListings && activeListings.length > 0) {
    throw new Error('Cannot delete category with active listings')
  }
  
  // Archive category instead of deleting
  await supabase
    .from('categories')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', categoryId)
}
```

### 3. System Configuration

#### Platform Settings
```typescript
// System configuration interface
interface SystemConfig {
  // Platform fees
  platform_fee_percentage: number
  
  // Security settings
  max_login_attempts: number
  session_timeout_minutes: number
  require_email_verification: boolean
  
  // Payment settings
  minimum_deposit_amount: number
  maximum_rental_days: number
  auto_release_deposit_days: number
  
  // Content moderation
  auto_approve_listings: boolean
  require_photo_verification: boolean
  max_listings_per_user: number
}

// Update system configuration
const updateSystemConfig = async (config: Partial<SystemConfig>) => {
  const { error } = await supabase
    .from('system_config')
    .upsert(config)
  
  if (error) throw error
  
  // Log configuration change
  await logAdminAction('config_updated', null, config)
}
```

---

## 📋 Admin Checklist

### Daily Tasks
- [ ] Review new user registrations
- [ ] Check pending content moderation
- [ ] Review new dispute claims
- [ ] Monitor system performance
- [ ] Check error logs
- [ ] Review security alerts

### Weekly Tasks
- [ ] Generate weekly analytics report
- [ ] Review user feedback and complaints
- [ ] Update content moderation guidelines
- [ ] Review and resolve pending disputes
- [ ] Check system backups
- [ ] Update admin documentation

### Monthly Tasks
- [ ] Generate monthly performance report
- [ ] Review platform metrics and trends
- [ ] Update system configuration
- [ ] Review and update security policies
- [ ] Plan platform improvements
- [ ] Review team performance

### Quarterly Tasks
- [ ] Comprehensive security audit
- [ ] Platform performance review
- [ ] User satisfaction survey
- [ ] Competitor analysis
- [ ] Strategic planning
- [ ] Team training and development

---

## 🚨 Emergency Procedures

### 1. Security Incidents

#### Incident Response
1. **Immediate Action**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Communication**: Notify relevant stakeholders
4. **Investigation**: Gather evidence and logs
5. **Resolution**: Implement fixes and patches
6. **Documentation**: Record incident details
7. **Review**: Post-incident analysis

#### Data Breach Response
```typescript
// Data breach response checklist
const dataBreachResponse = {
  immediate_actions: [
    'Identify affected data',
    'Block unauthorized access',
    'Preserve evidence',
    'Notify legal team',
    'Contact affected users'
  ],
  investigation: [
    'Analyze security logs',
    'Identify breach source',
    'Assess data exposure',
    'Document findings'
  ],
  recovery: [
    'Patch vulnerabilities',
    'Restore from backups',
    'Update security measures',
    'Monitor for recurrence'
  ]
}
```

### 2. System Outages

#### Outage Response
1. **Detection**: Monitor system alerts
2. **Assessment**: Determine outage scope
3. **Communication**: Update status page
4. **Resolution**: Implement fixes
5. **Recovery**: Restore services
6. **Post-mortem**: Analyze root cause

#### Backup and Recovery
```typescript
// Backup verification
const verifyBackups = async () => {
  const backupStatus = {
    database_backup: await checkDatabaseBackup(),
    file_backup: await checkFileBackup(),
    configuration_backup: await checkConfigBackup(),
    last_backup_time: await getLastBackupTime()
  }
  
  if (!backupStatus.database_backup || !backupStatus.file_backup) {
    await sendBackupAlert(backupStatus)
  }
  
  return backupStatus
}
```

---

## 📞 Support and Resources

### 1. Admin Support

#### Technical Support
- **Email**: admin@gearup.ro
- **Phone**: +40 XXX XXX XXX
- **Slack**: #admin-support channel
- **Documentation**: Internal admin wiki

#### Escalation Procedures
1. **Level 1**: Basic admin support
2. **Level 2**: Technical specialist
3. **Level 3**: System architect
4. **Level 4**: External vendor support

### 2. Training Resources

#### Admin Training
- **New Admin Onboarding**: 2-week training program
- **Monthly Workshops**: Platform updates and best practices
- **Certification Program**: Admin proficiency certification
- **Knowledge Base**: Comprehensive admin documentation

#### Best Practices
- **Security First**: Always prioritize security
- **Document Everything**: Record all admin actions
- **User Privacy**: Respect user data and privacy
- **Consistent Standards**: Apply policies consistently
- **Continuous Learning**: Stay updated with platform changes

---

This comprehensive admin guide ensures effective platform management, user support, and system maintenance for the GearUp platform. 