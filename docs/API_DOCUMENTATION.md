# API Documentation

## 📊 Overview

The GearUp platform provides a comprehensive REST API built on **Supabase** with **PostgreSQL** backend. The API supports real-time subscriptions, authentication, and secure data access through Row Level Security (RLS).

---

## 🔐 Authentication

### Authentication Methods

#### 1. Supabase Auth (Primary)

```typescript
// Initialize Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://your-project.supabase.co",
  "your-anon-key",
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password123",
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password123",
});

// Sign out
const { error } = await supabase.auth.signOut();
```

#### 2. JWT Token Authentication

```typescript
// Set auth header for API requests
const { data, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

### Authentication Headers

```http
Authorization: Bearer <jwt_token>
apikey: <supabase_anon_key>
```

---

## 📡 Base URL

### Development

```
https://your-project-ref.supabase.co/rest/v1/
```

### Production

```
https://your-project-ref.supabase.co/rest/v1/
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Changes

```typescript
// Subscribe to booking changes
const subscription = supabase
  .channel("bookings")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "bookings" },
    (payload) => {
      console.log("Booking changed:", payload);
    },
  )
  .subscribe();

// Subscribe to messages
const subscription = supabase
  .channel("messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      console.log("New message:", payload);
    },
  )
  .subscribe();

// Subscribe to transactions
const subscription = supabase
  .channel("transactions")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "transactions" },
    (payload) => {
      console.log("Transaction updated:", payload);
    },
  )
  .subscribe();
```

---

## 👤 User Management API

### Get Current User Profile

```http
GET /profiles?id=eq.{user_id}
```

**Response:**

```json
{
  "id": "uuid",
  "full_name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "location": "Bucharest, Romania",
  "phone": "+40123456789",
  "is_verified": false,
  "role": "renter",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Update User Profile

```http
PATCH /profiles?id=eq.{user_id}
Content-Type: application/json

{
  "full_name": "John Doe",
  "location": "Bucharest, Romania",
  "phone": "+40123456789"
}
```

### Upload Avatar

```typescript
// Upload avatar to Supabase Storage
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${user.id}/avatar.jpg`, file);

// Update profile with avatar URL
const { error } = await supabase
  .from("profiles")
  .update({ avatar_url: `${user.id}/avatar.jpg` })
  .eq("id", user.id);
```

---

## 📦 Gear Management API

### Get All Gear

```http
GET /gear?select=*,categories(name,slug)&is_available=eq.true
```

**Query Parameters:**

- `select`: Fields to return
- `category_id`: Filter by category
- `owner_id`: Filter by owner
- `price_per_day`: Filter by price range
- `condition`: Filter by condition
- `is_available`: Filter by availability

**Response:**

```json
[
  {
    "id": "uuid",
    "owner_id": "uuid",
    "name": "Sony A7 III",
    "description": "Professional mirrorless camera",
    "category_id": "uuid",
    "brand": "Sony",
    "model": "A7 III",
    "condition": "Foarte bună",
    "price_per_day": 5000,
    "deposit_amount": 10000,
    "pickup_location": "Bucharest, Romania",
    "specifications": ["24MP", "4K Video"],
    "included_items": ["Battery", "Charger"],
    "images": ["image1.jpg", "image2.jpg"],
    "is_available": true,
    "view_count": 150,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "categories": {
      "name": "Camere foto",
      "slug": "camere-foto"
    }
  }
]
```

### Get Single Gear Item

```http
GET /gear?id=eq.{gear_id}&select=*,categories(name,slug),profiles!owner_id(full_name,avatar_url,is_verified)
```

### Create Gear Listing

```http
POST /gear
Content-Type: application/json

{
  "name": "Sony A7 III",
  "description": "Professional mirrorless camera",
  "category_id": "uuid",
  "brand": "Sony",
  "model": "A7 III",
  "condition": "Foarte bună",
  "price_per_day": 5000,
  "deposit_amount": 10000,
  "pickup_location": "Bucharest, Romania",
  "specifications": ["24MP", "4K Video"],
  "included_items": ["Battery", "Charger"],
  "images": ["image1.jpg", "image2.jpg"]
}
```

### Update Gear Listing

```http
PATCH /gear?id=eq.{gear_id}
Content-Type: application/json

{
  "name": "Updated Camera Name",
  "price_per_day": 5500,
  "is_available": false
}
```

### Delete Gear Listing

```http
DELETE /gear?id=eq.{gear_id}
```

### Upload Gear Images

```typescript
// Upload images to Supabase Storage
const uploadPromises = files.map(async (file, index) => {
  const fileName = `${gearId}/image_${index}.jpg`;
  const { data, error } = await supabase.storage
    .from("gear-images")
    .upload(fileName, file);

  if (error) throw error;
  return fileName;
});

const uploadedFiles = await Promise.all(uploadPromises);

// Update gear with image URLs
const { error } = await supabase
  .from("gear")
  .update({ images: uploadedFiles })
  .eq("id", gearId);
```

---

## 📅 Booking Management API

### Create Booking

```http
POST /bookings
Content-Type: application/json

{
  "gear_id": "uuid",
  "renter_id": "uuid",
  "owner_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-01-17",
  "total_days": 3,
  "total_amount": 15000,
  "deposit_amount": 10000,
  "notes": "Pickup at coffee shop"
}
```

### Get User Bookings

```http
GET /bookings?select=*,gear(name,images),profiles!renter_id(full_name),profiles!owner_id(full_name)&or=(renter_id.eq.{user_id},owner_id.eq.{user_id})
```

### Update Booking Status

```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Cancel Booking

```http
PATCH /bookings?id=eq.{booking_id}
Content-Type: application/json

{
  "status": "cancelled"
}
```

---

## 💳 Payment & Transaction API

### Create Transaction

```http
POST /transactions
Content-Type: application/json

{
  "booking_id": "uuid",
  "stripe_payment_intent_id": "pi_1234567890",
  "amount": 25000,
  "platform_fee": 3250,
  "deposit_amount": 10000,
  "rental_amount": 11750,
  "payment_method": "card",
  "stripe_charge_id": "ch_1234567890"
}
```

### Get Transaction Details

```http
GET /transactions?select=*,bookings(gear(name),profiles!renter_id(full_name))&booking_id=eq.{booking_id}
```

### Update Transaction Status

```http
PATCH /transactions?id=eq.{transaction_id}
Content-Type: application/json

{
  "status": "completed"
}
```

### Process Refund

```http
PATCH /transactions?id=eq.{transaction_id}
Content-Type: application/json

{
  "status": "refunded",
  "refund_amount": 10000,
  "refund_reason": "Equipment returned early"
}
```

### Get User Transactions

```http
GET /transactions?select=*,bookings(gear(name),profiles!renter_id(full_name),profiles!owner_id(full_name))&or=(bookings.renter_id.eq.{user_id},bookings.owner_id.eq.{user_id})
```

---

## 💬 Messaging API

### Send Message

```http
POST /messages
Content-Type: application/json

{
  "booking_id": "uuid",
  "sender_id": "uuid",
  "content": "What time should we meet for pickup?"
}
```

### Get Messages for Booking

```http
GET /messages?select=*,profiles!sender_id(full_name,avatar_url)&booking_id=eq.{booking_id}&order=created_at.asc
```

### Mark Message as Read

```http
PATCH /messages?id=eq.{message_id}
Content-Type: application/json

{
  "is_read": true
}
```

### Get Unread Message Count

```http
GET /messages?select=id&is_read=eq.false&or=(bookings.renter_id.eq.{user_id},bookings.owner_id.eq.{user_id})&count=exact
```

---

## ⭐ Reviews API

### Create Review

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

### Get Gear Reviews

```http
GET /reviews?select=*,profiles!reviewer_id(full_name,avatar_url)&gear_id=eq.{gear_id}&order=created_at.desc
```

### Get User Reviews

```http
GET /reviews?select=*,gear(name,images),profiles!reviewer_id(full_name)&reviewed_id=eq.{user_id}&order=created_at.desc
```

### Update Review

```http
PATCH /reviews?id=eq.{review_id}
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated review comment"
}
```

---

## 🛡️ Claims & Disputes API

### Create Claim

```http
POST /claims
Content-Type: application/json

{
  "booking_id": "uuid",
  "claimant_id": "uuid",
  "claim_type": "damage",
  "description": "Camera lens has scratches that weren't there before",
  "evidence_photos": ["photo1.jpg", "photo2.jpg"]
}
```

### Get Claims for Booking

```http
GET /claims?select=*,profiles!claimant_id(full_name)&booking_id=eq.{booking_id}&order=created_at.desc
```

### Update Claim Status (Admin Only)

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

### Get User Claims

```http
GET /claims?select=*,bookings(gear(name))&claimant_id=eq.{user_id}&order=created_at.desc
```

---

## 📸 Photo Upload API

### Upload Handover Photos

```typescript
// Upload photos to Supabase Storage
const uploadPhoto = async (
  bookingId: string,
  photoType: string,
  file: File,
) => {
  const fileName = `${bookingId}/${photoType}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from("handover-photos")
    .upload(fileName, file);

  if (error) throw error;

  // Create photo upload record
  const { error: dbError } = await supabase.from("photo_uploads").insert({
    booking_id: bookingId,
    uploaded_by: userId,
    photo_type: photoType,
    photo_url: fileName,
    metadata: {
      file_size: file.size,
      mime_type: file.type,
      uploaded_at: new Date().toISOString(),
    },
  });

  if (dbError) throw dbError;

  return fileName;
};
```

### Get Photos for Booking

```http
GET /photo_uploads?select=*&booking_id=eq.{booking_id}&order=timestamp.asc
```

### Get Photos by Type

```http
GET /photo_uploads?select=*&booking_id=eq.{booking_id}&photo_type=eq.pickup_renter
```

---

## 🚦 Rate Limiting API

### Check Rate Limit

```typescript
// Check if user can perform action
const canPerformAction = await supabase.rpc("check_rate_limit", {
  action_type: "create_booking",
  max_actions: 10,
  window_minutes: 60,
});

if (!canPerformAction.data) {
  throw new Error("Rate limit exceeded");
}
```

### Get User Rate Limits

```http
GET /rate_limits?select=*&user_id=eq.{user_id}&order=created_at.desc
```

### Rate Limit Configuration

```typescript
const rateLimits = {
  create_booking: { max_actions: 10, window_minutes: 60 },
  send_message: { max_actions: 50, window_minutes: 60 },
  upload_photo: { max_actions: 20, window_minutes: 60 },
  create_review: { max_actions: 5, window_minutes: 60 },
};
```

---

## 📊 Categories API

### Get All Categories

```http
GET /categories?select=*&order=name.asc
```

### Get Category by Slug

```http
GET /categories?select=*&slug=eq.camere-foto
```

### Create Category (Admin Only)

```http
POST /categories
Content-Type: application/json

{
  "name": "New Category",
  "slug": "new-category",
  "description": "Category description",
  "icon_name": "IconName"
}
```

---

## 🔍 Search & Filter API

### Advanced Gear Search

```http
GET /gear?select=*,categories(name,slug),profiles!owner_id(full_name,rating)&is_available=eq.true&category_id=eq.{category_id}&price_per_day.gte.{min_price}&price_per_day.lte.{max_price}&condition=eq.{condition}&order=created_at.desc
```

### Search by Location

```http
GET /gear?select=*,categories(name)&is_available=eq.true&pickup_location=ilike.%{location}%&order=created_at.desc
```

### Search by Brand/Model

```http
GET /gear?select=*,categories(name)&is_available=eq.true&or=(brand.ilike.%{search_term}%,model.ilike.%{search_term}%,name.ilike.%{search_term}%)&order=created_at.desc
```

---

## 📈 Analytics API

### Get User Statistics

```typescript
// Get user booking statistics
const getUserStats = async (userId: string) => {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("status, total_amount")
    .or(`renter_id.eq.${userId},owner_id.eq.${userId}`);

  const { data: gear } = await supabase
    .from("gear")
    .select("view_count, is_available")
    .eq("owner_id", userId);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewed_id", userId);

  return {
    total_bookings: bookings?.length || 0,
    total_earnings: bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0,
    total_listings: gear?.length || 0,
    average_rating:
      reviews?.reduce((sum, r) => sum + r.rating, 0) / (reviews?.length || 1) ||
      0,
  };
};
```

### Get Platform Statistics (Admin Only)

```typescript
// Get platform-wide statistics
const getPlatformStats = async () => {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("status, total_amount, created_at")
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const { data: users } = await supabase
    .from("profiles")
    .select("created_at")
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  const { data: gear } = await supabase.from("gear").select("is_available");

  return {
    monthly_bookings: bookings?.length || 0,
    monthly_revenue: bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0,
    monthly_new_users: users?.length || 0,
    total_available_gear: gear?.filter((g) => g.is_available).length || 0,
  };
};
```

---

## 🔒 Security & Validation

### Input Validation

```typescript
// Validate gear input
const validateGearInput = (gear: any) => {
  if (!gear.name || gear.name.length < 3 || gear.name.length > 100) {
    throw new Error("Invalid gear name");
  }

  if (!gear.price_per_day || gear.price_per_day <= 0) {
    throw new Error("Invalid price");
  }

  if (gear.description && gear.description.length > 2000) {
    throw new Error("Description too long");
  }
};

// Validate booking input
const validateBookingInput = (booking: any) => {
  if (new Date(booking.start_date) <= new Date()) {
    throw new Error("Start date must be in the future");
  }

  if (new Date(booking.end_date) <= new Date(booking.start_date)) {
    throw new Error("End date must be after start date");
  }

  if (booking.total_days <= 0) {
    throw new Error("Invalid rental duration");
  }
};
```

### Rate Limiting

```typescript
// Apply rate limiting to API calls
const rateLimitedApiCall = async (
  actionType: string,
  apiCall: () => Promise<any>,
) => {
  const { data: canProceed } = await supabase.rpc("check_rate_limit", {
    action_type: actionType,
  });

  if (!canProceed) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  return apiCall();
};
```

---

## 🚨 Error Handling

### Standard Error Response

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": "Additional error details"
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

### Error Handling Example

```typescript
const handleApiError = (error: any) => {
  if (error.code === "AUTH_REQUIRED") {
    // Redirect to login
    window.location.href = "/login";
  } else if (error.code === "RATE_LIMIT_EXCEEDED") {
    // Show rate limit message
    showToast("Too many requests. Please wait before trying again.");
  } else if (error.code === "VALIDATION_ERROR") {
    // Show validation error
    showToast(error.message);
  } else {
    // Show generic error
    showToast("An unexpected error occurred. Please try again.");
  }
};
```

---

## 📱 Mobile API Considerations

### Optimized Responses

```typescript
// Optimize responses for mobile
const getOptimizedGearList = async () => {
  const { data, error } = await supabase
    .from("gear")
    .select(
      `
      id,
      name,
      price_per_day,
      deposit_amount,
      images,
      is_available,
      owner:profiles!owner_id(full_name, rating),
      category:categories(name)
    `,
    )
    .eq("is_available", true)
    .order("created_at", { ascending: false })
    .limit(20);

  return data?.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price_per_day,
    deposit: item.deposit_amount,
    image: item.images?.[0], // Only first image for mobile
    owner: item.owner?.full_name,
    ownerRating: item.owner?.rating,
    category: item.category?.name,
  }));
};
```

### Pagination

```typescript
// Implement cursor-based pagination
const getPaginatedResults = async (
  table: string,
  cursor?: string,
  limit: number = 20,
) => {
  let query = supabase.from(table).select("*").limit(limit);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;
  return {
    data: data || [],
    nextCursor: data && data.length === limit ? data[data.length - 1].id : null,
  };
};
```

---

This comprehensive API documentation covers all endpoints and functionality available in the GearUp platform, ensuring developers can effectively integrate with the system.
