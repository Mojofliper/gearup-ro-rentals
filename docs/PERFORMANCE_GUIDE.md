# Performance Guide

## ⚡ Overview

This guide covers performance optimization strategies, monitoring, and best practices for the GearUp platform. It includes frontend, backend, database, and infrastructure optimization techniques.

---

## 🎯 Performance Goals

### 1. Target Metrics

#### Core Web Vitals
```typescript
interface PerformanceTargets {
  // Loading Performance
  First Contentful Paint (FCP): '< 1.8s',
  Largest Contentful Paint (LCP): '< 2.5s',
  
  // Interactivity
  First Input Delay (FID): '< 100ms',
  Cumulative Layout Shift (CLS): '< 0.1',
  
  // User Experience
  Time to Interactive (TTI): '< 3.8s',
  Speed Index: '< 3.4s'
}
```

#### Business Metrics
- **Page Load Time**: < 2 seconds
- **Search Results**: < 500ms
- **Image Loading**: < 1 second
- **Payment Processing**: < 3 seconds
- **Real-time Updates**: < 100ms latency

### 2. Performance Budgets

#### Frontend Budget
```typescript
const performanceBudget = {
  // JavaScript
  totalJS: '300KB',
  initialJS: '150KB',
  
  // CSS
  totalCSS: '50KB',
  
  // Images
  totalImages: '1MB',
  heroImage: '200KB',
  
  // Fonts
  totalFonts: '100KB',
  
  // Third-party
  thirdParty: '200KB'
}
```

---

## 🖥️ Frontend Optimization

### 1. React Performance

#### Component Optimization
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return (
    <div>
      {data.map(item => (
        <GearCard key={item.id} gear={item} />
      ))}
    </div>
  )
})

// Use useMemo for expensive calculations
const filteredGear = useMemo(() => {
  return gear.filter(item => 
    item.category === selectedCategory &&
    item.price <= maxPrice
  )
}, [gear, selectedCategory, maxPrice])

// Use useCallback for event handlers
const handleBooking = useCallback((gearId: string) => {
  // Booking logic
}, [])
```

#### Code Splitting
```typescript
// Lazy load components
const BookingModal = lazy(() => import('./BookingModal'))
const PaymentModal = lazy(() => import('./PaymentModal'))
const Profile = lazy(() => import('./Profile'))

// Route-based splitting
const App = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/booking" element={<BookingModal />} />
        <Route path="/payment" element={<PaymentModal />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  )
}
```

### 2. Image Optimization

#### Image Loading Strategy
```typescript
// Progressive image loading
const ProgressiveImage = ({ src, alt, placeholder }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
    }
    img.src = src
  }, [src])

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-50'
      }`}
    />
  )
}

// Responsive images
const ResponsiveImage = ({ src, alt, sizes }) => {
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      srcSet={`
        ${src}?w=300 300w,
        ${src}?w=600 600w,
        ${src}?w=900 900w
      `}
      loading="lazy"
    />
  )
}
```

#### Image Compression
```typescript
// Image optimization utilities
const optimizeImage = async (file: File): Promise<File> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()
  
  return new Promise((resolve) => {
    img.onload = () => {
      // Calculate optimal dimensions
      const maxWidth = 1200
      const maxHeight = 800
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(optimizedFile)
        }
      }, 'image/jpeg', 0.8)
    }
    
    img.src = URL.createObjectURL(file)
  })
}
```

### 3. Bundle Optimization

#### Webpack Configuration
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: { progressive: true },
              optipng: { enabled: false },
              pngquant: { quality: [0.65, 0.90], speed: 4 },
              gifsicle: { interlaced: false }
            }
          }
        ]
      }
    ]
  }
}
```

#### Tree Shaking
```typescript
// Import only what you need
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// Instead of: import * from '@/components/ui'

// Use dynamic imports for large libraries
const loadMap = async () => {
  const { Map } = await import('leaflet')
  return Map
}
```

---

## 🗄️ Database Optimization

### 1. Query Optimization

#### Indexing Strategy
```sql
-- Primary indexes
CREATE INDEX idx_gear_owner_id ON gear(owner_id);
CREATE INDEX idx_gear_category_id ON gear(category_id);
CREATE INDEX idx_gear_location ON gear(location);
CREATE INDEX idx_gear_created_at ON gear(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_gear_search ON gear(category_id, location, is_available, price);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date, status);
CREATE INDEX idx_reviews_gear_rating ON reviews(gear_id, rating, created_at);

-- Full-text search index
CREATE INDEX idx_gear_search_text ON gear USING gin(to_tsvector('english', name || ' ' || description));
```

#### Query Optimization
```sql
-- Optimized gear search query
SELECT 
  g.id,
  g.name,
  g.description,
  g.price_per_day,
  g.location,
  g.images,
  p.full_name as owner_name,
  p.rating as owner_rating,
  c.name as category_name,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as review_count
FROM gear g
INNER JOIN profiles p ON g.owner_id = p.id
INNER JOIN categories c ON g.category_id = c.id
LEFT JOIN reviews r ON g.id = r.gear_id
WHERE g.is_available = true
  AND g.category_id = $1
  AND g.location <-> point($2, $3) < $4
  AND g.price_per_day BETWEEN $5 AND $6
GROUP BY g.id, p.full_name, p.rating, c.name
HAVING COUNT(r.id) >= $7
ORDER BY g.location <-> point($2, $3), g.created_at DESC
LIMIT 20;
```

### 2. Connection Pooling

#### Supabase Configuration
```typescript
// Database connection configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_ANON_KEY,
  options: {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'gearup-web'
      }
    }
  }
}

// Connection pooling
const poolConfig = {
  max: 20,
  min: 2,
  acquire: 30000,
  idle: 10000
}
```

### 3. Caching Strategy

#### Redis Caching
```typescript
// Redis cache implementation
class CacheService {
  private redis: Redis
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD
    })
  }
  
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key)
    return data ? JSON.parse(data) : null
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}

// Cache usage
const cacheService = new CacheService()

const getGearListings = async (filters: GearFilters) => {
  const cacheKey = `gear:${JSON.stringify(filters)}`
  
  // Try cache first
  let gear = await cacheService.get<Gear[]>(cacheKey)
  
  if (!gear) {
    // Fetch from database
    gear = await fetchGearFromDB(filters)
    
    // Cache for 15 minutes
    await cacheService.set(cacheKey, gear, 900)
  }
  
  return gear
}
```

---

## 🚀 Backend Optimization

### 1. API Optimization

#### Response Optimization
```typescript
// Optimize API responses
const getGearListings = async (req: Request, res: Response) => {
  const { category, location, price_min, price_max, limit = 20 } = req.query
  
  // Build optimized query
  let query = supabase
    .from('gear')
    .select(`
      id,
      name,
      price_per_day,
      location,
      images,
      owner:profiles!owner_id(full_name, rating),
      category:categories(name),
      reviews(reviews(id, rating))
    `)
    .eq('is_available', true)
    .limit(parseInt(limit as string))
  
  // Apply filters
  if (category) query = query.eq('category_id', category)
  if (price_min) query = query.gte('price_per_day', price_min)
  if (price_max) query = query.lte('price_per_day', price_max)
  
  const { data, error } = await query
  
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  
  // Transform data for frontend
  const transformedData = data?.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price_per_day,
    location: item.location,
    image: item.images?.[0],
    owner: {
      name: item.owner?.full_name,
      rating: item.owner?.rating
    },
    category: item.category?.name,
    rating: item.reviews?.length > 0 
      ? item.reviews.reduce((acc, r) => acc + r.rating, 0) / item.reviews.length 
      : 0
  }))
  
  res.json(transformedData)
}
```

#### Pagination
```typescript
// Efficient pagination
const getPaginatedResults = async (
  table: string,
  page: number = 1,
  limit: number = 20,
  filters: any = {}
) => {
  const offset = (page - 1) * limit
  
  // Get total count
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .match(filters)
  
  // Get paginated data
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .match(filters)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })
  
  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasNext: page * limit < (count || 0),
      hasPrev: page > 1
    }
  }
}
```

### 2. Real-time Optimization

#### WebSocket Management
```typescript
// Optimize real-time subscriptions
class RealtimeManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map()
  
  subscribeToMessages(bookingId: string, callback: (message: Message) => void) {
    const channelKey = `messages:${bookingId}`
    
    if (this.subscriptions.has(channelKey)) {
      return this.subscriptions.get(channelKey)
    }
    
    const subscription = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          callback(payload.new as Message)
        }
      )
      .subscribe()
    
    this.subscriptions.set(channelKey, subscription)
    return subscription
  }
  
  unsubscribe(channelKey: string) {
    const subscription = this.subscriptions.get(channelKey)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(channelKey)
    }
  }
  
  unsubscribeAll() {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
  }
}
```

---

## 📊 Performance Monitoring

### 1. Frontend Monitoring

#### Core Web Vitals Tracking
```typescript
// Performance monitoring
const trackPerformance = () => {
  // Track Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      
      analytics.track('LCP', {
        value: lastEntry.startTime,
        url: window.location.href
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })
    
    // First Input Delay
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        analytics.track('FID', {
          value: entry.processingStart - entry.startTime,
          url: window.location.href
        })
      })
    }).observe({ entryTypes: ['first-input'] })
    
    // Cumulative Layout Shift
    new PerformanceObserver((entryList) => {
      let clsValue = 0
      const entries = entryList.getEntries()
      
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += (entry as any).value
        }
      })
      
      analytics.track('CLS', {
        value: clsValue,
        url: window.location.href
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }
}

// Track custom metrics
const trackCustomMetrics = () => {
  // Time to first byte
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navigation) {
    analytics.track('TTFB', {
      value: navigation.responseStart - navigation.requestStart,
      url: window.location.href
    })
  }
  
  // Resource loading times
  const resources = performance.getEntriesByType('resource')
  resources.forEach(resource => {
    analytics.track('ResourceLoad', {
      name: resource.name,
      duration: resource.duration,
      size: (resource as any).transferSize
    })
  })
}
```

### 2. Backend Monitoring

#### API Performance Tracking
```typescript
// API performance middleware
const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    // Track API performance
    analytics.track('API_Performance', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
    
    // Alert on slow requests
    if (duration > 5000) {
      alertService.sendAlert('Slow API Request', {
        method: req.method,
        path: req.path,
        duration,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  next()
}
```

### 3. Database Monitoring

#### Query Performance
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table performance
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

---

## 🔧 Performance Tools

### 1. Development Tools

#### Lighthouse CI
```yaml
# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

#### Bundle Analyzer
```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

module.exports = {
  plugins: [
    process.env.ANALYZE && new BundleAnalyzerPlugin()
  ].filter(Boolean)
}
```

### 2. Production Monitoring

#### Application Performance Monitoring
```typescript
// APM configuration
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(history)
    })
  ]
})

// Performance monitoring
Sentry.addPerformanceInstrumentationHandler(
  'http',
  (data) => {
    if (data.url.includes('/api/')) {
      analytics.track('API_Call', {
        url: data.url,
        method: data.method,
        duration: data.endTimestamp - data.startTimestamp
      })
    }
  }
)
```

---

## 📈 Performance Optimization Checklist

### 1. Frontend Checklist
- [ ] **Code Splitting**: Implement route-based and component-based splitting
- [ ] **Image Optimization**: Compress images, use WebP format, implement lazy loading
- [ ] **Bundle Optimization**: Minimize bundle size, remove unused code
- [ ] **Caching**: Implement service worker, browser caching
- [ ] **CDN**: Use CDN for static assets
- [ ] **Critical CSS**: Inline critical CSS, defer non-critical styles

### 2. Backend Checklist
- [ ] **Database Indexing**: Create proper indexes for common queries
- [ ] **Query Optimization**: Optimize slow queries, use pagination
- [ ] **Caching**: Implement Redis caching for frequently accessed data
- [ ] **Connection Pooling**: Configure proper connection pool settings
- [ ] **API Optimization**: Minimize response payload, use compression
- [ ] **Real-time Optimization**: Efficient WebSocket management

### 3. Infrastructure Checklist
- [ ] **CDN**: Configure CDN for global content delivery
- [ ] **Load Balancing**: Implement load balancers for high availability
- [ ] **Auto-scaling**: Configure auto-scaling based on demand
- [ ] **Monitoring**: Set up comprehensive monitoring and alerting
- [ ] **Backup**: Regular database and file backups
- [ ] **SSL/TLS**: Proper SSL configuration and certificate management

### 4. Testing Checklist
- [ ] **Performance Testing**: Load testing with realistic scenarios
- [ ] **Lighthouse Audits**: Regular performance audits
- [ ] **Bundle Analysis**: Monitor bundle size and composition
- [ ] **Database Performance**: Monitor query performance and slow queries
- [ ] **Real User Monitoring**: Track actual user performance metrics

---

This comprehensive performance guide ensures the GearUp platform delivers fast, responsive, and efficient user experiences across all devices and network conditions. 