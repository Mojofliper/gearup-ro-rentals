# Complete API Endpoints Documentation

## 🎯 Overview

This document provides comprehensive API endpoints for the redesigned GearUp platform, supporting all planned features including escrow system, admin dashboard, photo documentation, and notifications.

---

## 🔐 Authentication

### Base Headers
```http
Authorization: Bearer <jwt_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

---

## 👤 User Management API

### User Profile Management

#### Get Current User Profile
```http
GET /profiles?id=eq.{user_id}&select=*
```

#### Update User Profile
```http
PATCH /profiles?id=eq.{user_id}
Content-Type: application/json

{
  "full_name": "John Doe",
  "phone": "+40123456789",
  "location": "Bucharest",
  "county": "București"
}
```

#### Upload Verification Document
```http
POST /verification_documents
Content-Type: application/json

{
  "document_type": "id_card",
  "document_url": "https://storage.example.com/documents/user_123_id_card.jpg"
}
```

#### Get User Verification Status
```http
GET /verification_documents?user_id=eq.{user_id}&select=*
```

---

## 🎒 Gear Management API

### Gear Listings

#### Get All Available Gear
```http
GET /gear?select=*,categories(name,slug),profiles!owner_id(full_name,rating)&is_available=eq.true&status=eq.active&order=created_at.desc
```

#### Get Single Gear Item
```http
GET /gear?id=eq.{gear_id}&select=*,categories(name,slug),profiles!owner_id(*),gear_images(*)
```

#### Create Gear Listing
```http
POST /gear
Content-Type: application/json

{
  "category_id": "uuid",
  "name": "Sony A7 III",
  "description": "Professional mirrorless camera",
  "brand": "Sony",
  "model": "A7 III",
  "condition": "Foarte bună",
  "price_per_day": 5000,
  "deposit_amount": 10000,
  "pickup_location": "Bucharest, Romania",
  "pickup_coordinates": "(44.4268, 26.1025)",
  "specifications": ["24MP", "4K Video"],
  "included_items": ["Battery", "Charger"],
  "excluded_items": ["Memory Card"],
  "requirements": ["Valid ID required"]
}
```

#### Update Gear Listing
```http
PATCH /gear?id=eq.{gear_id}
Content-Type: application/json

{
  "name": "Updated Camera Name",
  "price_per_day": 5500,
  "is_available": false
}
```

#### Delete Gear Listing
```http
DELETE /gear?id=eq.{gear_id}
```

### Gear Images

#### Upload Gear Images
```http
POST /gear_images
Content-Type: application/json

{
  "gear_id": "uuid",
  "image_url": "https://storage.example.com/gear/image1.jpg",
  "image_type": "main",
  "sort_order": 1,
  "alt_text": "Sony A7 III front view"
}
```

#### Get Gear Images
```http
GET /gear_images?gear_id=eq.{gear_id}&order=sort_order.asc
```

#### Delete Gear Image
```http
DELETE /gear_images?id=eq.{image_id}
```

---

## 📅 Booking Management API

### Booking Operations

#### Create Booking
```http
POST /bookings
Content-Type: application/json

{
  "gear_id": "uuid",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "pickup_location": "Coffee Shop, Bucharest",
  "renter_notes": "Pickup at 10 AM"
}
```

#### Accept Booking & Set Pickup Location
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "confirmed",
  "pickup_location": "Exact Address, Bucharest",
  "pickup_coordinates": "(44.4268, 26.1025)"
}
```

#### Get Rental Dashboard Data
```http
GET /bookings?id=eq.{booking_id}&select=*,gear(name,gear_images),profiles!renter_id(full_name),profiles!owner_id(full_name),transactions(escrow_status,rental_amount,deposit_amount)
```

#### Confirm Return (Renter)
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "returned",
  "return_confirmed_at": "2024-02-03T18:00:00Z"
}
```

#### Confirm Return (Owner)
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "completed",
  "return_confirmed_at": "2024-02-03T18:00:00Z"
}
```

#### Get User Bookings
```http
GET /bookings?select=*,gear(name,gear_images),profiles!renter_id(full_name),profiles!owner_id(full_name)&or=(renter_id.eq.{user_id},owner_id.eq.{user_id})&order=created_at.desc
```

#### Update Booking Status
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "confirmed"
}
```

#### Cancel Booking
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "cancelled",
  "cancellation_reason": "Emergency came up"
}
```

#### Confirm Pickup
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "pickup_confirmed",
  "pickup_confirmed_at": "2024-02-01T10:00:00Z"
}
```

#### Confirm Return
```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "returned",
  "return_confirmed_at": "2024-02-03T18:00:00Z"
}
```

---

## 💳 Payment & Escrow API

### Stripe Connect Setup

#### Create Connected Account
```http
POST /connected_accounts
Content-Type: application/json

{
  "owner_id": "uuid"
}
```

#### Get Connected Account Status
```http
GET /connected_accounts?owner_id=eq.{owner_id}&select=*
```

### Transactions

#### Create Payment Intent
```http
POST /transactions
Content-Type: application/json

{
  "booking_id": "uuid",
  "amount": 25000,
  "platform_fee": 3250,
  "rental_amount": 15000,
  "deposit_amount": 6750
}
```

#### Get Transaction Details
```http
GET /transactions?booking_id=eq.{booking_id}&select=*
```

#### Process Refund
```http
PATCH /transactions?id=eq.{transaction_id}
Content-Type: application/json

{
  "status": "refunded",
  "refund_amount": 10000,
  "refund_reason": "Equipment returned early"
}
```

### Escrow Management

#### Release Escrow Funds
```http
POST /escrow_releases
Content-Type: application/json

{
  "transaction_id": "uuid",
  "booking_id": "uuid",
  "release_type": "automatic",
  "rental_amount": 15000,
  "deposit_amount": 6750
}
```

#### Get Escrow Status
```http
GET /escrow_releases?transaction_id=eq.{transaction_id}&select=*
```

---

## 💬 Messaging API

### Conversations

#### Get User Conversations
```http
GET /conversations?or=(participant1_id.eq.{user_id},participant2_id.eq.{user_id})&order=last_message_at.desc
```

#### Create Conversation
```http
POST /conversations
Content-Type: application/json

{
  "booking_id": "uuid",
  "participant1_id": "uuid",
  "participant2_id": "uuid"
}
```

### Messages

#### Send Message
```http
POST /messages
Content-Type: application/json

{
  "conversation_id": "uuid",
  "content": "What time should we meet for pickup?",
  "message_type": "text"
}
```

#### Get Conversation Messages
```http
GET /messages?conversation_id=eq.{conversation_id}&order=created_at.asc
```

#### Mark Message as Read
```http
PATCH /messages?id=eq.{message_id}
Content-Type: application/json

{
  "is_read": true,
  "read_at": "2024-02-01T10:00:00Z"
}
```

#### Get Unread Message Count
```http
GET /messages?conversation_id=eq.{conversation_id}&is_read=eq.false&count=exact
```

---

## ⭐ Reviews API

### Review Management

#### Create Review
```http
POST /reviews
Content-Type: application/json

{
  "booking_id": "uuid",
  "reviewer_id": "uuid",
  "reviewed_id": "uuid",
  "gear_id": "uuid",
  "rating": 5,
  "comment": "Great equipment, very professional owner!"
}
```

#### Get Gear Reviews
```http
GET /reviews?gear_id=eq.{gear_id}&select=*,profiles!reviewer_id(full_name,avatar_url)&order=created_at.desc
```

#### Get User Reviews
```http
GET /reviews?reviewed_id=eq.{user_id}&select=*,gear(name,gear_images),profiles!reviewer_id(full_name)&order=created_at.desc
```

#### Update Review
```http
PATCH /reviews?id=eq.{review_id}
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated review comment"
}
```

---

## 🛡️ Dispute Resolution API

### Claims Management

#### Create Claim
```http
POST /claims
Content-Type: application/json

{
  "booking_id": "uuid",
  "claimant_id": "uuid",
  "claim_type": "damage",
  "severity": "medium",
  "description": "Camera lens has scratches that weren't there before",
  "requested_amount": 5000
}
```

#### Get Claims for Booking
```http
GET /claims?booking_id=eq.{booking_id}&select=*,profiles!claimant_id(full_name),claim_evidence(*)
```

#### Update Claim Status (Admin)
```http
PATCH /claims?id=eq.{claim_id}
Content-Type: application/json

{
  "status": "resolved",
  "resolution": "Deposit penalty of 5000 RON applied",
  "deposit_penalty": 5000,
  "admin_id": "uuid"
}
```

### Claim Evidence

#### Upload Evidence
```http
POST /claim_evidence
Content-Type: application/json

{
  "claim_id": "uuid",
  "evidence_type": "photo",
  "evidence_url": "https://storage.example.com/evidence/damage_photo.jpg",
  "description": "Damage to camera lens",
  "uploaded_by": "uuid"
}
```

#### Get Claim Evidence
```http
GET /claim_evidence?claim_id=eq.{claim_id}&select=*
```

---

## 📸 Photo Documentation API

### Handover Photos

#### Upload Handover Photo
```http
POST /handover_photos
Content-Type: application/json

{
  "booking_id": "uuid",
  "uploaded_by": "uuid",
  "photo_type": "pickup_renter",
  "photo_url": "https://storage.example.com/handover/pickup_renter.jpg",
  "thumbnail_url": "https://storage.example.com/handover/pickup_renter_thumb.jpg",
  "metadata": {
    "camera_info": "iPhone 14 Pro",
    "location": "Coffee Shop, Bucharest",
    "timestamp": "2024-02-01T10:00:00Z"
  }
}
```

#### Get Handover Photos
```http
GET /handover_photos?booking_id=eq.{booking_id}&select=*
```

#### Get Photos by Type
```http
GET /handover_photos?booking_id=eq.{booking_id}&photo_type=eq.pickup_renter&select=*
```

---

## 🔔 Notification API

### Notification Preferences

#### Get User Preferences
```http
GET /notification_preferences?user_id=eq.{user_id}&select=*
```

#### Update Preferences
```http
PATCH /notification_preferences?user_id=eq.{user_id}
Content-Type: application/json

{
  "email_notifications": true,
  "push_notifications": false,
  "sms_notifications": true,
  "booking_updates": true,
  "payment_updates": true,
  "message_notifications": true,
  "review_notifications": true,
  "marketing_emails": false
}
```

### Notifications

#### Get User Notifications
```http
GET /notifications?user_id=eq.{user_id}&order=created_at.desc&limit=50
```

#### Mark Notification as Read
```http
PATCH /notifications?id=eq.{notification_id}
Content-Type: application/json

{
  "read_at": "2024-02-01T10:00:00Z"
}
```

#### Get Unread Count
```http
GET /notifications?user_id=eq.{user_id}&read_at=is.null&count=exact
```

---

## 👨‍💼 Admin API

### User Management

#### Get All Users
```http
GET /profiles?select=*&order=created_at.desc
```

#### Suspend User
```http
PATCH /profiles?id=eq.{user_id}
Content-Type: application/json

{
  "is_verified": false,
  "admin_notes": "Account suspended for violations"
}
```

#### Verify User
```http
PATCH /profiles?id=eq.{user_id}
Content-Type: application/json

{
  "is_verified": true,
  "verification_level": "verified"
}
```

### Content Moderation

#### Get Moderation Queue
```http
GET /moderation_queue?status=eq.pending&select=*&order=created_at.asc
```

#### Review Content
```http
PATCH /moderation_queue?id=eq.{queue_id}
Content-Type: application/json

{
  "status": "approved",
  "admin_notes": "Content approved"
}
```

### Platform Analytics

#### Get User Activity
```http
GET /user_activity?user_id=eq.{user_id}&order=created_at.desc&limit=100
```

#### Get Platform Metrics
```http
GET /platform_analytics?date=eq.{date}&select=*
```

---

## 🔍 Search & Discovery API

### Advanced Search

#### Search Gear with Filters
```http
GET /gear?select=*,categories(name,slug),profiles!owner_id(full_name,rating)&is_available=eq.true&status=eq.active&category_id=eq.{category_id}&price_per_day.gte.{min_price}&price_per_day.lte.{max_price}&condition=eq.{condition}&order=created_at.desc
```

#### Search by Location
```http
GET /gear?select=*,categories(name)&is_available=eq.true&pickup_location=ilike.%{location}%&order=created_at.desc
```

#### Search by Brand/Model
```http
GET /gear?select=*,categories(name)&is_available=eq.true&or=(brand.ilike.%{search_term}%,model.ilike.%{search_term}%,name.ilike.%{search_term}%)&order=created_at.desc
```

#### Full-text Search
```http
GET /gear?select=*,categories(name)&is_available=eq.true&textSearch=websearch('{search_term}')&order=created_at.desc
```

### Featured Gear

#### Get Featured Gear
```http
GET /gear?select=*,categories(name,slug),profiles!owner_id(full_name,rating)&is_featured=eq.true&is_available=eq.true&order=created_at.desc&limit=10
```

---

## 📊 Analytics API

### User Analytics

#### Get User Statistics
```http
GET /profiles?select=total_bookings,total_earnings,rating,total_reviews&id=eq.{user_id}
```

### Owner Analytics Dashboard

#### Get Owner Financial Analytics
```http
GET /rpc/get_owner_analytics?owner_id={owner_id}
```

#### Get Equipment Performance
```http
GET /gear?owner_id=eq.{owner_id}&select=*,bookings(count),reviews(avg_rating)&order=view_count.desc
```

#### Get Revenue Breakdown
```http
GET /transactions?select=sum(rental_amount),sum(platform_fee),count(*)&booking_id=in.(select id from bookings where owner_id=eq.{owner_id})
```

#### Get Stripe Connect Status
```http
GET /connected_accounts?owner_id=eq.{owner_id}&select=account_status,charges_enabled,payouts_enabled
```

#### Export Financial Data
```http
GET /rpc/export_owner_financials?owner_id={owner_id}&start_date={start_date}&end_date={end_date}
```

#### Get User Activity Summary
```http
GET /user_activity?user_id=eq.{user_id}&activity_type=in.(gear_viewed,booking_created,payment_made)&created_at.gte.{start_date}&created_at.lte.{end_date}&select=activity_type,count(*)
```

### Platform Analytics

#### Get Platform Statistics
```http
GET /platform_analytics?date=eq.{date}&select=metric_name,metric_value
```

#### Get Revenue Analytics
```http
GET /transactions?status=eq.completed&created_at.gte.{start_date}&created_at.lte.{end_date}&select=sum(amount),sum(platform_fee),count(*)
```

---

## 🛡️ Security API

### Rate Limiting

#### Check Rate Limit
```http
POST /rpc/check_rate_limit
Content-Type: application/json

{
  "action_type": "create_booking",
  "max_actions": 10,
  "window_minutes": 60
}
```

#### Get User Rate Limits
```http
GET /rate_limits?user_id=eq.{user_id}&order=created_at.desc
```

### Security Events

#### Report Security Event
```http
POST /security_events
Content-Type: application/json

{
  "user_id": "uuid",
  "event_type": "suspicious_activity",
  "severity": "medium",
  "details": {
    "activity": "Multiple failed login attempts",
    "ip_address": "192.168.1.1"
  }
}
```

---

## ⚙️ System Configuration API

### System Settings

#### Get Public Settings
```http
GET /system_settings?is_public=eq.true&select=setting_key,setting_value,setting_type,description
```

#### Update System Setting (Admin)
```http
PATCH /system_settings?setting_key=eq.{key}
Content-Type: application/json

{
  "setting_value": "new_value",
  "updated_by": "admin_user_id"
}
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Changes

#### Booking Updates
```typescript
const subscription = supabase
  .channel('bookings')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
    (payload) => {
      console.log('Booking updated:', payload)
    }
  )
  .subscribe()
```

#### Messages
```typescript
const subscription = supabase
  .channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    (payload) => {
      console.log('New message:', payload)
    }
  )
  .subscribe()
```

#### Notifications
```typescript
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => {
      console.log('New notification:', payload)
    }
  )
  .subscribe()
```

---

## 🚨 Error Handling

### Standard Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": "Additional error details",
    "timestamp": "2024-02-01T10:00:00Z"
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `CONFLICT`: Resource conflict (e.g., booking already exists)
- `PAYMENT_FAILED`: Payment processing failed
- `ESCROW_ERROR`: Escrow system error
- `BOOKING_CONFLICT`: Date conflict with existing booking

---

## 📱 Mobile API Considerations

### Optimized Responses
```typescript
// Optimize responses for mobile
const getOptimizedGearList = async () => {
  const { data, error } = await supabase
    .from('gear')
    .select(`
      id,
      name,
      price_per_day,
      deposit_amount,
      pickup_location,
      gear_images!inner(image_url),
      profiles!owner_id(full_name, rating),
      categories(name)
    `)
    .eq('is_available', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20)
  
  return data?.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price_per_day,
    deposit: item.deposit_amount,
    location: item.pickup_location,
    image: item.gear_images?.[0]?.image_url,
    owner: item.profiles?.full_name,
    ownerRating: item.profiles?.rating,
    category: item.categories?.name
  }))
}
```

### Pagination
```typescript
// Implement cursor-based pagination
const getPaginatedResults = async (table: string, cursor?: string, limit: number = 20) => {
  let query = supabase
    .from(table)
    .select('*')
    .limit(limit)
  
  if (cursor) {
    query = query.gt('id', cursor)
  }
  
  const { data, error } = await query
  return {
    data: data || [],
    nextCursor: data && data.length === limit ? data[data.length - 1].id : null
  }
}
```

---

This comprehensive API documentation covers all endpoints needed for the complete GearUp platform implementation, supporting the redesigned database schema and all planned features from the roadmap. 