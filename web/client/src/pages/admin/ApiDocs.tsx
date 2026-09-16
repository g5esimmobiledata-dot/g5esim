import { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Code,
  Book,
  Smartphone,
  Server,
  Key,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Shield,
  Users,
  ShoppingCart,
  Package,
  Settings,
  Bell,
  Gift,
  CreditCard,
  Globe,
  MapPin,
  MessageSquare,
  BarChart3,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = window.location.origin;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  auth: 'public' | 'user' | 'admin';
  requestBody?: Record<string, any>;
  queryParams?: Array<{ name: string; type: string; description: string; required?: boolean }>;
  pathParams?: Array<{ name: string; type: string; description: string }>;
  responses: Array<{
    status: number;
    description: string;
    example?: Record<string, any>;
  }>;
}

interface ApiCategory {
  name: string;
  icon: any;
  description: string;
  basePath: string;
  endpoints: ApiEndpoint[];
}

const externalApiCategory: ApiCategory = {
  name: 'External Partner API (v1)',
  icon: Zap,
  description:
    'External API for partners and mobile apps - requires API Key authentication (X-API-Key + X-API-Secret headers)',
  basePath: '/api/v1',
  endpoints: [
    {
      method: 'GET',
      path: '/api/v1/packages',
      title: 'List Packages',
      description:
        'Get available eSIM Packages with filtering. Returns retail prices. Pagination returns the filtered slice count, not full database total.',
      auth: 'user',
      queryParams: [
        {
          name: 'destination',
          type: 'string',
          description: 'Filter by destination slug or country code',
          required: false,
        },
        {
          name: 'type',
          type: 'string',
          description: 'Filter by package type (data, voice, combo)',
          required: false,
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Max results (default: 50, max: 100)',
          required: false,
        },
        { name: 'offset', type: 'number', description: 'Pagination offset', required: false },
      ],
      responses: [
        {
          status: 200,
          description: 'Packages fetched',
          example: {
            success: true,
            data: [
              {
                id: 'uuid',
                slug: 'japan-1gb-7d',
                title: 'Japan 1GB 7 Days',
                dataAmount: '1GB',
                validity: 7,
                price: '4.99',
                currency: 'USD',
                type: 'data',
                destination: 'Japan',
                destinationCode: 'JP',
                provider: 'Airalo',
                isUnlimited: false,
                voiceCredits: null,
                smsCredits: null,
              },
            ],
            pagination: { total: 50, limit: 50, offset: 0 },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 401,
          description: 'Invalid Credentials',
          example: {
            success: false,
            error: 'Invalid API key',
            message: 'The provided API key is not valid',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/packages/:id',
      title: 'Get Package Details',
      description:
        'Get detailed information about a specific package including coverage areas and wholesale price',
      auth: 'user',
      pathParams: [{ name: 'id', type: 'uuid', description: 'Package UUID' }],
      responses: [
        {
          status: 200,
          description: 'Package found',
          example: {
            success: true,
            data: {
              id: 'uuid',
              slug: 'japan-1gb-7d',
              title: 'Japan 1GB 7 Days',
              dataAmount: '1GB',
              validity: 7,
              price: '4.99',
              wholesalePrice: '3.50',
              currency: 'USD',
              type: 'data',
              destination: 'Japan',
              destinationCode: 'JP',
              provider: 'Airalo',
              isUnlimited: false,
              voiceCredits: null,
              smsCredits: null,
              coverage: ['Japan'],
            },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 404,
          description: 'Package not found',
          example: {
            success: false,
            error: 'Package not found',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/destinations',
      title: 'List Destinations',
      description: 'Get all available destinations/countries for eSIM Packages',
      auth: 'user',
      responses: [
        {
          status: 200,
          description: 'Destinations fetched',
          example: {
            success: true,
            data: [
              { id: 'uuid', name: 'Japan', slug: 'japan', countryCode: 'JP', flagEmoji: null },
            ],
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/destinations/:slug',
      title: 'Get Destination with Packages',
      description:
        'Get destination details along with all available Packages for that destination, sorted by price',
      auth: 'user',
      pathParams: [
        { name: 'slug', type: 'string', description: "Destination slug (e.g., 'japan')" },
      ],
      responses: [
        {
          status: 200,
          description: 'Destination found',
          example: {
            success: true,
            data: {
              destination: {
                id: 'uuid',
                name: 'Japan',
                slug: 'japan',
                countryCode: 'JP',
                flagEmoji: null,
              },
              packages: [
                {
                  id: 'uuid',
                  slug: 'japan-1gb',
                  title: 'Japan 1GB',
                  dataAmount: '1GB',
                  validity: 7,
                  price: '4.99',
                  currency: 'USD',
                  provider: 'Airalo',
                  isUnlimited: false,
                },
              ],
            },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 404,
          description: 'Destination not found',
          example: {
            success: false,
            error: 'Destination not found',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/orders',
      title: 'Create Order',
      description:
        'Create a new eSIM order. Supports quantity 1-10. Uses smart failover - if primary provider fails, automatically tries backup providers.',
      auth: 'user',
      requestBody: {
        packageId: 'uuid',
        quantity: 1,
        customer: { email: 'customer@example.com', phone: '+1234567890' },
        webhookUrl: 'https://your-site.com/webhook',
        reference: 'your-order-ref-123',
      },
      responses: [
        {
          status: 201,
          description: 'Order created successfully',
          example: {
            success: true,
            data: {
              orderId: 'uuid',
              displayOrderId: 'ORD-12345',
              status: 'completed',
              packageId: 'uuid',
              quantity: 1,
              totalPrice: 4.99,
              currency: 'USD',
              esims: [{ iccid: '8944xxx', qrCode: 'LPA:1$...', qrCodeUrl: 'https://...' }],
              failoverUsed: false,
              reference: 'your-order-ref-123',
            },
            message: 'Order created successfully',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 400,
          description: 'Invalid request',
          example: {
            success: false,
            error: 'Missing customer email',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 404,
          description: 'Package not found',
          example: {
            success: false,
            error: 'Package not found',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 500,
          description: 'Order failed',
          example: {
            success: false,
            error: 'Order creation failed',
            errorCode: 'PROVIDER_ERROR',
            failoverAttempts: 3,
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/orders',
      title: 'List Orders',
      description: 'Get all Orders created via the API. Supports pagination and status filtering.',
      auth: 'user',
      queryParams: [
        {
          name: 'limit',
          type: 'number',
          description: 'Max results (default: 20, max: 100)',
          required: false,
        },
        { name: 'offset', type: 'number', description: 'Pagination offset', required: false },
        {
          name: 'status',
          type: 'string',
          description: 'Filter by status (pending, completed, failed)',
          required: false,
        },
      ],
      responses: [
        {
          status: 200,
          description:
            'Orders fetched (note: pagination.total equals the count of returned records, not full database count)',
          example: {
            success: true,
            data: [
              {
                orderId: 'uuid',
                displayOrderId: 'ORD-12345',
                status: 'completed',
                quantity: 1,
                price: '4.99',
                currency: 'USD',
                iccid: '8944xxx',
                createdAt: '2025-01-04T12:00:00Z',
              },
            ],
            pagination: { total: 1, limit: 20, offset: 0 },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/orders/:id',
      title: 'Get Order Details',
      description:
        'Get detailed order information including eSIM activation details, usage data, and APN configuration',
      auth: 'user',
      pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
      responses: [
        {
          status: 200,
          description: 'Order found',
          example: {
            success: true,
            data: {
              orderId: 'uuid',
              displayOrderId: 'ORD-12345',
              status: 'completed',
              quantity: 1,
              price: '4.99',
              currency: 'USD',
              dataAmount: '1GB',
              validity: 7,
              iccid: '8944xxx',
              qrCode: 'LPA:1$...',
              qrCodeUrl: 'https://...',
              smdpAddress: 'smdp.example.com',
              activationCode: 'ABC123',
              directAppleUrl: null,
              apnType: 'automatic',
              apnValue: null,
              activatedAt: null,
              expiresAt: null,
              usageData: null,
              failoverUsed: false,
              createdAt: '2025-01-04T12:00:00Z',
              updatedAt: '2025-01-04T12:00:00Z',
            },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 404,
          description: 'Order not found',
          example: { success: false, error: 'Order not found', timestamp: '2025-01-04T12:00:00Z' },
        },
      ],
    },
    {
      method: 'POST',
      path: '/api/v1/orders/:id/cancel',
      title: 'Cancel Order',
      description: 'Cancel a pending or processing order. Cannot cancel completed Orders.',
      auth: 'user',
      pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
      requestBody: { reason: 'Customer requested cancellation' },
      responses: [
        {
          status: 200,
          description: 'Order cancelled',
          example: {
            success: true,
            data: { orderId: 'uuid', status: 'cancelled' },
            message: 'Order cancellation requested',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 400,
          description: 'Cannot cancel',
          example: {
            success: false,
            error: 'Order cannot be cancelled',
            message: 'Order status is completed',
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
        {
          status: 404,
          description: 'Order not found',
          example: { success: false, error: 'Order not found', timestamp: '2025-01-04T12:00:00Z' },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/account',
      title: 'Get Account Info',
      description:
        'Get information about your API key including permissions, rate limits, and expiration',
      auth: 'user',
      responses: [
        {
          status: 200,
          description: 'Account info',
          example: {
            success: true,
            data: {
              name: 'Mobile App',
              keyPrefix: 'esim_abc...',
              isActive: true,
              rateLimit: 1000,
              permissions: { orders: true, packages: true },
              requestCount: 1250,
              lastUsedAt: '2025-01-04T12:00:00Z',
              expiresAt: null,
              createdAt: '2025-01-01T00:00:00Z',
            },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
    {
      method: 'GET',
      path: '/api/v1/account/usage',
      title: 'Get Usage Statistics',
      description: 'Get API usage statistics including request counts and order totals',
      auth: 'user',
      responses: [
        {
          status: 200,
          description: 'Usage stats',
          example: {
            success: true,
            data: {
              totalRequests: 1250,
              totalOrders: 85,
              rateLimit: 1000,
              lastUsedAt: '2025-01-04T12:00:00Z',
            },
            timestamp: '2025-01-04T12:00:00Z',
          },
        },
      ],
    },
  ],
};

const apiCategories: ApiCategory[] = [
  externalApiCategory,
  {
    name: 'Authentication',
    icon: Key,
    description: 'User authentication endpoints using OTP-based email verification',
    basePath: '/api/auth',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/send-otp',
        title: 'Send OTP Code',
        description: "Send a one-time password to user's email for authentication",
        auth: 'public',
        requestBody: { email: 'user@example.com' },
        responses: [
          {
            status: 200,
            description: 'OTP sent successfully',
            example: {
              success: true,
              message: 'OTP sent successfully',
              data: { email: 'user@example.com' },
            },
          },
          {
            status: 400,
            description: 'Email is required',
            example: { success: false, message: 'Email is required' },
          },
          {
            status: 500,
            description: 'Server error',
            example: { success: false, message: 'Failed to send email' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/auth/verify-otp',
        title: 'Verify OTP & Login',
        description:
          'Verify OTP code and create an authenticated session. Optionally registers new users.',
        auth: 'public',
        requestBody: {
          email: 'user@example.com',
          otp: '123456',
          name: 'John Doe',
          fcmToken: 'optional-fcm-token',
        },
        responses: [
          {
            status: 200,
            description: 'Login successful',
            example: {
              success: true,
              message: 'Login successful',
              data: { user: { id: 'uuid', email: 'user@example.com', name: 'John Doe' } },
            },
          },
          {
            status: 400,
            description: 'Invalid or expired OTP',
            example: { success: false, message: 'Invalid or expired OTP' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        title: 'Get Current User',
        description: "Get the currently authenticated user's profile",
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'User fetched successfully',
            example: {
              success: true,
              data: { id: 'uuid', email: 'user@example.com', name: 'John Doe' },
            },
          },
          {
            status: 401,
            description: 'Not authenticated',
            example: { success: false, message: 'Unauthorized' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        title: 'Logout',
        description: 'End the user session and clear cookies',
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'Logged out successfully',
            example: { success: true, message: 'Logged out successfully' },
          },
        ],
      },
    ],
  },
  {
    name: 'Destinations',
    icon: MapPin,
    description: 'Country/destination endpoints for browsing eSIM coverage areas',
    basePath: '/api/destinations',
    endpoints: [
      {
        method: 'GET',
        path: '/api/destinations',
        title: 'List All Destinations',
        description:
          'Get all available countries/destinations for eSIM Packages. Cached for 10 minutes.',
        auth: 'public',
        responses: [
          {
            status: 200,
            description: 'Destinations fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', name: 'Japan', slug: 'japan', countryCode: 'JP', active: true }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/destinations/with-pricing',
        title: 'Destinations with Pricing',
        description: 'Get destinations with minimum package prices. Supports currency conversion.',
        auth: 'public',
        queryParams: [
          {
            name: 'currency',
            type: 'string',
            description: 'Target currency code (e.g., USD, EUR)',
            required: false,
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Destinations with pricing',
            example: {
              success: true,
              data: [
                { id: 'uuid', name: 'Japan', slug: 'japan', minPrice: '4.50', currency: 'USD' },
              ],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/destinations/slug/:slug',
        title: 'Get Destination by Slug',
        description: 'Get a specific destination by its URL-friendly slug',
        auth: 'public',
        pathParams: [
          { name: 'slug', type: 'string', description: "Destination slug (e.g., 'japan')" },
        ],
        responses: [
          {
            status: 200,
            description: 'Destination found',
            example: {
              success: true,
              data: { id: 'uuid', name: 'Japan', slug: 'japan', countryCode: 'JP' },
            },
          },
          {
            status: 404,
            description: 'Destination not found',
            example: { success: false, message: 'Destination not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Regions',
    icon: Globe,
    description: 'Regional eSIM Packages covering multiple countries',
    basePath: '/api/regions',
    endpoints: [
      {
        method: 'GET',
        path: '/api/regions',
        title: 'List All Regions',
        description: 'Get all available regions (e.g., Europe, Asia). Cached for 10 minutes.',
        auth: 'public',
        responses: [
          {
            status: 200,
            description: 'Regions fetched',
            example: { success: true, data: [{ id: 'uuid', name: 'Europe', slug: 'europe' }] },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/regions/with-pricing',
        title: 'Regions with Pricing',
        description: 'Get regions with minimum package prices',
        auth: 'public',
        queryParams: [
          {
            name: 'currency',
            type: 'string',
            description: 'Target currency code',
            required: false,
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Regions with pricing',
            example: {
              success: true,
              data: [{ id: 'uuid', name: 'Europe', minPrice: '12.99', currency: 'USD' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/regions/slug/:slug',
        title: 'Get Region by Slug',
        description: 'Get a specific region by its slug',
        auth: 'public',
        pathParams: [{ name: 'slug', type: 'string', description: 'Region slug' }],
        responses: [
          {
            status: 200,
            description: 'Region found',
            example: { success: true, data: { id: 'uuid', name: 'Europe', slug: 'europe' } },
          },
          {
            status: 404,
            description: 'Region not found',
            example: { success: false, message: 'Region not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Packages',
    icon: Package,
    description: 'eSIM package catalog and browsing',
    basePath: '/api/packages',
    endpoints: [
      {
        method: 'GET',
        path: '/api/packages',
        title: 'List All Packages',
        description: 'Get all eSIM Packages with pricing margin applied',
        auth: 'public',
        responses: [
          {
            status: 200,
            description: 'Packages fetched',
            example: {
              success: true,
              data: [
                { id: 'uuid', title: 'Japan 1GB', dataAmount: '1GB', validity: 7, price: '4.50' },
              ],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/featured',
        title: 'Featured Packages',
        description: 'Get top 8 featured Packages by sales count',
        auth: 'public',
        responses: [
          {
            status: 200,
      description: 'Featured Packages',
            example: {
              success: true,
              data: [{ id: 'uuid', title: 'Japan 1GB', retailPrice: '4.50' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/global',
        title: 'Global Packages',
        description: 'Get Packages for the Global region (worldwide coverage)',
        auth: 'public',
        responses: [
          { status: 200, description: 'Global Packages', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/stats',
        title: 'Package Statistics',
        description: 'Get total count of Packages and destinations',
        auth: 'public',
        responses: [
          {
            status: 200,
            description: 'Stats fetched',
            example: { success: true, data: { totalPackages: 150, totalDestinations: 120 } },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/slug/:slug',
        title: 'Get Package by Slug',
        description: 'Get package details by URL slug',
        auth: 'public',
        pathParams: [{ name: 'slug', type: 'string', description: 'Package slug' }],
        responses: [
          {
            status: 200,
            description: 'Package found',
            example: { success: true, data: { id: 'uuid', title: 'Japan 1GB', price: '4.50' } },
          },
          {
            status: 404,
            description: 'Package not found',
            example: { success: false, message: 'Package not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/:id',
        title: 'Get Package by ID',
        description: 'Get package details by UUID',
        auth: 'public',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Package UUID' }],
        responses: [
          {
            status: 200,
            description: 'Package found',
            example: { success: true, data: { id: 'uuid', title: 'Japan 1GB' } },
          },
          {
            status: 404,
            description: 'Package not found',
            example: { success: false, message: 'Package not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/:packageId/reviews',
        title: 'Get Package Reviews',
        description: 'Get Approved reviews for a package with pagination',
        auth: 'public',
        pathParams: [{ name: 'packageId', type: 'uuid', description: 'Package UUID' }],
        queryParams: [
          {
            name: 'rating',
            type: 'number',
            description: 'Filter by rating (1-5)',
            required: false,
          },
          {
            name: 'page',
            type: 'number',
            description: 'Page number (default: 1)',
            required: false,
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Reviews fetched',
            example: {
              success: true,
              data: { reviews: [], pagination: { page: 1, limit: 20, total: 0 } },
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/packages/:packageId/review-stats',
        title: 'Package Review Stats',
        description: 'Get review statistics (average rating, distribution)',
        auth: 'public',
        pathParams: [{ name: 'packageId', type: 'uuid', description: 'Package UUID' }],
        responses: [
          {
            status: 200,
            description: 'Stats fetched',
            example: {
              success: true,
              data: {
                average: 4.5,
                total: 100,
                distribution: { '1': 5, '2': 10, '3': 15, '4': 30, '5': 40 },
              },
            },
          },
        ],
      },
    ],
  },
  {
    name: 'Unified Packages',
    icon: Package,
    description: 'Consolidated package catalog with multi-provider pricing',
    basePath: '/api/unified-packages',
    endpoints: [
      {
        method: 'GET',
        path: '/api/unified-packages',
        title: 'List Unified Packages',
        description:
          'Get all enabled Packages with retail pricing and currency conversion. Cached for 5 minutes.',
        auth: 'public',
        queryParams: [
          {
            name: 'currency',
            type: 'string',
            description: 'Target currency (default: USD)',
            required: false,
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Packages fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', title: 'Japan 1GB', price: '4.50', providerName: 'Airalo' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/unified-packages/global',
        title: 'List Global Packages',
        description: 'Get all global eSIM Packages with pricing',
        auth: 'public',
        responses: [
          {
            status: 200,
            description: 'Global Packages fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', title: 'Global 1GB', price: '9.00' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/unified-packages/slug/:slug',
        title: 'Get Package by Slug',
        description: 'Get unified package by slug',
        auth: 'public',
        pathParams: [{ name: 'slug', type: 'string', description: 'Package slug' }],
        responses: [
          {
            status: 200,
            description: 'Package found',
            example: { success: true, data: { id: 'uuid', title: 'Japan 1GB' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Package not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Orders',
    icon: ShoppingCart,
    description: 'Customer order management and eSIM provisioning',
    basePath: '/api/orders',
    endpoints: [
      {
        method: 'GET',
        path: '/api/orders/my-orders',
        title: 'Get My Orders',
        description: 'Get all Orders for the authenticated user with package details',
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'Orders fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', status: 'completed', iccid: '8944xxx' }],
            },
          },
          {
            status: 401,
            description: 'Unauthorized',
            example: { success: false, message: 'Authentication required' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/orders',
        title: 'Create Order',
        description: 'Create a new eSIM order. Supports single and batch Orders.',
        auth: 'user',
        requestBody: { packageId: 'uuid', quantity: 1 },
        responses: [
          {
            status: 201,
            description: 'Order created',
            example: { success: true, data: { order: { id: 'uuid', status: 'completed' } } },
          },
          {
            status: 400,
            description: 'Invalid request',
            example: { success: false, message: 'Invalid package or quantity' },
          },
          {
            status: 404,
            description: 'Package not found',
            example: { success: false, message: 'Package not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/orders/:orderId/esim',
        title: 'Get eSIM Details',
        description: 'Get eSIM installation details (QR code, activation code) for an order',
        auth: 'user',
        pathParams: [{ name: 'orderId', type: 'uuid', description: 'Order UUID' }],
        responses: [
          {
            status: 200,
            description: 'eSIM details',
            example: {
              success: true,
              data: { esim: { iccid: '8944xxx', qrCodeUrl: 'https://...', lpaCode: 'LPA:1$...' } },
            },
          },
          {
            status: 404,
            description: 'Order not found',
            example: { success: false, message: 'Order not found' },
          },
          {
            status: 403,
            description: 'Access denied',
            example: { success: false, message: 'Access denied' },
          },
        ],
      },
    ],
  },
  {
    name: 'Customer Profile',
    icon: Users,
    description: 'Customer profile and account management',
    basePath: '/api/customer',
    endpoints: [
      {
        method: 'GET',
        path: '/api/customer/profile',
        title: 'Get Profile',
        description: "Get the authenticated customer's profile",
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'Profile fetched',
            example: {
              success: true,
              data: { id: 'uuid', email: 'user@example.com', name: 'John' },
            },
          },
          {
            status: 404,
            description: 'User not found',
            example: { success: false, message: 'User not found' },
          },
        ],
      },
      {
        method: 'PUT',
        path: '/api/customer/profile',
        title: 'Update Profile',
        description: 'Update customer profile information',
        auth: 'user',
        requestBody: {
          name: 'John Doe',
          phone: '+1234567890',
          address: '123 Main St',
          currency: 'USD',
        },
        responses: [
          {
            status: 200,
            description: 'Profile updated',
            example: { success: true, data: { id: 'uuid', name: 'John Doe' } },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/customer/notification-preferences',
        title: 'Update Notification Preferences',
        description: 'Update low data and expiring eSIM notification settings',
        auth: 'user',
        requestBody: { notifyLowData: true, notifyExpiring: true },
        responses: [
          {
            status: 200,
            description: 'Preferences updated',
            example: { success: true, data: { notifyLowData: true, notifyExpiring: true } },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/orders',
        title: 'Get Customer Orders',
        description: 'Get all Orders for the current customer',
        auth: 'user',
        responses: [
          { status: 200, description: 'Orders fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/esims',
        title: 'Get Customer eSIMs',
        description: 'Get all completed eSIMs for the customer',
        auth: 'user',
        responses: [
          { status: 200, description: 'eSIMs fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/activity',
        title: 'Get Activity Log',
        description: 'Get customer activity history',
        auth: 'user',
        responses: [
          { status: 200, description: 'Activity fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'POST',
        path: '/api/customer/kyc/upload',
        title: 'Upload KYC Document',
        description: 'Upload identity verification document',
        auth: 'user',
        requestBody: { documentType: 'passport' },
        responses: [
          {
            status: 201,
            description: 'Document uploaded',
            example: { success: true, data: { document: { id: 'uuid', status: 'pending' } } },
          },
          {
            status: 400,
            description: 'No file uploaded',
            example: { success: false, message: 'No file uploaded' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/kyc/documents',
        title: 'Get KYC Documents',
        description: 'Get all KYC documents for the user',
        auth: 'user',
        responses: [
          { status: 200, description: 'Documents fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/my-esims-usages',
        title: 'Get eSIM Usage',
        description: 'Get data usage statistics for all active eSIMs',
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'Usage data fetched',
            example: {
              success: true,
              data: [{ iccid: '8944xxx', totalData: '1GB', remainingData: '500MB' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/customer/topups',
        title: 'Get Topups',
        description: 'Get all topup Orders and history',
        auth: 'user',
        responses: [
          { status: 200, description: 'Topups fetched', example: { success: true, data: [] } },
        ],
      },
    ],
  },
  {
    name: 'Notifications',
    icon: Bell,
    description: 'User notification management',
    basePath: '/api/notifications',
    endpoints: [
      {
        method: 'GET',
        path: '/api/notifications',
        title: 'Get Notifications',
        description: 'Get all notifications for the authenticated user',
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'Notifications fetched',
            example: { success: true, data: { notifications: [], unreadCount: 0 } },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/notifications/:id/read',
        title: 'Mark as Read',
        description: 'Mark a specific notification as read',
        auth: 'user',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Notification UUID' }],
        responses: [
          {
            status: 200,
            description: 'Marked as read',
            example: { success: true, message: 'Notification marked as read' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/notifications/read-all',
        title: 'Mark All as Read',
        description: 'Mark all notifications as read for the user',
        auth: 'user',
        responses: [
          {
            status: 200,
            description: 'All marked as read',
            example: { success: true, message: 'All notifications marked as read' },
          },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/notifications/delete-all-notification',
        title: 'Delete All Notifications',
        description: 'Delete all notifications for the authenticated user',
        auth: 'user',
        responses: [
          { status: 200, description: 'All notifications deleted' },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/notifications/:id',
        title: 'Delete Notification',
        description: 'Delete a specific notification',
        auth: 'user',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Notification UUID' }],
        responses: [
          { status: 200, description: 'Notification deleted' },
        ],
      },
    ],
  },
  {
    name: 'Support Tickets',
    icon: MessageSquare,
    description: 'Customer support ticket system',
    basePath: '/api/tickets',
    endpoints: [
      {
        method: 'GET',
        path: '/api/tickets/my-tickets',
        title: 'Get My Tickets',
        description: 'Get all support tickets for the authenticated user',
        auth: 'user',
        responses: [
          { status: 200, description: 'Tickets fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/tickets/:id',
        title: 'Get Ticket Details',
        description: 'Get a specific ticket by ID',
        auth: 'user',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Ticket UUID' }],
        responses: [
          {
            status: 200,
            description: 'Ticket found',
            example: { success: true, data: { id: 'uuid', title: 'Help needed', status: 'open' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Ticket not found' },
          },
          {
            status: 403,
            description: 'Access denied',
            example: { success: false, message: 'Access denied to this ticket' },
          },
        ],
      },
      // wite by deepak date : 17/03/2026
      {
        method: 'PUT',
        path: '/api/tickets/:id',
        title: 'Update Ticket (Status or Priority)',
        description: 'Update a ticket status or priority (only one field allowed at a time)',
        auth: 'user',
        pathParams: [
          { name: 'id', type: 'uuid', description: 'Ticket UUID' }
        ],
        body: [
          {
            name: 'status',
            type: 'string',
            required: false,
            description: 'New ticket status (e.g., open, in_progress, resolved, closed)'
          },
          {
            name: 'priority',
            type: 'string',
            required: false,
            description: 'New ticket priority (e.g., low, medium, high)'
          }
        ],
        rules: [
          'Only one field (status OR priority) can be updated at a time'
        ],
        responses: [
          {
            status: 200,
            description: 'Ticket updated successfully',
            example: {
              success: true,
              message: 'Ticket updated successfully',
              data: {
                ticket: {
                  id: 'uuid',
                  title: 'Help needed',
                  status: 'in_progress',
                  priority: 'high'
                }
              }
            }
          },
          {
            status: 400,
            description: 'Invalid request',
            example: {
              success: false,
              message: 'Provide either status or priority, not both'
            }
          },
          {
            status: 403,
            description: 'Access denied',
            example: {
              success: false,
              message: 'Access denied to this ticket'
            }
          },
          {
            status: 404,
            description: 'Ticket not found',
            example: {
              success: false,
              message: 'Ticket not found'
            }
          },
          {
            status: 500,
            description: 'Server error',
            example: {
              success: false,
              message: 'Internal server error'
            }
          }
        ]
      },
      {
        method: 'POST',
        path: '/api/tickets',
        title: 'Create Ticket',
        description: 'Create a new support ticket',
        auth: 'user',
        requestBody: {
          title: 'Cannot activate eSIM',
          description: 'I scanned the QR code but...',
          priority: 'high',
        },
        responses: [
          {
            status: 201,
            description: 'Ticket created',
            example: { success: true, data: { ticket: { id: 'uuid', status: 'open' } } },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/tickets/:id/reply',
        title: 'Reply to Ticket (Admin)',
        description: 'Admin reply to a support ticket',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Ticket UUID' }],
        requestBody: { message: 'Thank you for contacting us...', isInternal: false },
        responses: [
          {
            status: 200,
            description: 'Reply added',
            example: { success: true, data: { reply: { id: 'uuid' } } },
          },
          {
            status: 404,
            description: 'Ticket not found',
            example: { success: false, message: 'Ticket not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Authentication',
    icon: Shield,
    description: 'Admin Panel authentication endpoints',
    basePath: '/api/admin',
    endpoints: [
      {
        method: 'POST',
        path: '/api/admin/login',
        title: 'Admin Login',
        description: 'Authenticate admin with email and password',
        auth: 'public',
        requestBody: { email: 'admin@example.com', password: 'password123' },
        responses: [
          {
            status: 200,
            description: 'Login successful',
            example: {
              success: true,
              data: { admin: { id: 'uuid', email: 'admin@example.com', role: 'super_admin' } },
            },
          },
          {
            status: 400,
            description: 'Missing Credentials',
            example: { success: false, message: 'Email and password are required' },
          },
          {
            status: 401,
            description: 'Invalid Credentials',
            example: { success: false, message: 'Invalid Credentials' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/me',
        title: 'Get Admin Profile',
        description: "Get the currently authenticated Admin's profile",
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Admin fetched',
            example: {
              success: true,
              data: { id: 'uuid', email: 'admin@example.com', name: 'Admin', role: 'super_admin' },
            },
          },
          {
            status: 401,
            description: 'Unauthorized',
            example: { success: false, message: 'Admin not found' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/logout',
        title: 'Admin Logout',
        description: 'End Admin session',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Logged out',
            example: { success: true, message: 'Logged out successfully' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Dashboard',
    icon: BarChart3,
    description: 'Dashboard statistics and analytics',
    basePath: '/api/admin',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/stats',
        title: 'Get Dashboard Stats',
        description: 'Get platform statistics with time filter',
        auth: 'admin',
        queryParams: [
          {
            name: 'timeFilter',
            type: 'string',
            description: '7days | 30days | lifetime',
            required: false,
          },
        ],
        responses: [
          {
            status: 200,
            description: 'Stats fetched',
            example: {
              success: true,
              data: { totalOrders: 100, totalRevenue: '5000.00', totalCustomers: 50 },
            },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Customers',
    icon: Users,
    description: 'Customer management for administrators',
    basePath: '/api/admin/customers',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/customers',
        title: 'List All Customers',
        description: 'Get all registered Customers',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Customers fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', email: 'user@example.com', name: 'John' }],
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/customers/:id',
        title: 'Get Customer Details',
        description: 'Get detailed customer information',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Customer UUID' }],
        responses: [
          {
            status: 200,
            description: 'Customer found',
            example: { success: true, data: { id: 'uuid', email: 'user@example.com' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Customer not found' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/customers/:id',
        title: 'Update Customer',
        description: 'Update customer profile and KYC status',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Customer UUID' }],
        requestBody: { name: 'John Doe', email: 'john@example.com', kycStatus: 'approved' },
        responses: [
          {
            status: 200,
            description: 'Customer updated',
            example: { success: true, data: { id: 'uuid' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Customer not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/customers/:id/orders',
        title: 'Get Customer Orders',
        description: 'Get all Orders for a specific customer',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Customer UUID' }],
        responses: [
          { status: 200, description: 'Orders fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/customers/:id/activity',
        title: 'Get Customer Activity',
        description: 'Get activity log for a customer',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Customer UUID' }],
        responses: [
          { status: 200, description: 'Activity fetched', example: { success: true, data: [] } },
        ],
      },
    ],
  },
  {
    name: 'Admin Orders',
    icon: ShoppingCart,
    description: 'Order management, refunds, and cancellations',
    basePath: '/api/admin/orders',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/orders',
        title: 'List All Orders',
        description: 'Get all Orders sorted by creation date',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Orders fetched',
            example: { success: true, data: [{ id: 'uuid', status: 'completed' }] },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/orders/:id',
        title: 'Get Order Details',
        description: 'Get detailed order information with package and provider details',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
        responses: [
          {
            status: 200,
            description: 'Order found',
            example: {
              success: true,
              data: { id: 'uuid', status: 'completed', providerName: 'Airalo' },
            },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Order not found' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/orders/:id',
        title: 'Update Order',
        description: 'Update order status and eSIM details',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
        requestBody: { status: 'completed', iccid: '8944xxx', qrCode: 'LPA:1$...' },
        responses: [
          {
            status: 200,
            description: 'Order updated',
            example: { success: true, data: { id: 'uuid' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Order not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/orders/:id/refund-eligibility',
        title: 'Check Refund Eligibility',
        description: 'Check if an order is eligible for refund based on provider capabilities',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
        responses: [
          {
            status: 200,
            description: 'Eligibility checked',
            example: { success: true, data: { eligible: true, reason: 'Unused eSIM' } },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/orders/:id/refund',
        title: 'Process Refund',
        description: 'Process a refund for an order (provider + payment)',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
        requestBody: {
          reason: 'CUSTOMER_REQUEST',
          notes: 'Customer requested refund',
          refundPayment: true,
        },
        responses: [
          {
            status: 200,
            description: 'Refund processed',
            example: {
              success: true,
              data: { providerResult: { status: 'refunded' }, paymentResult: { success: true } },
            },
          },
          {
            status: 400,
            description: 'Refund failed',
            example: { success: false, message: 'Refund failed' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/orders/:id/cancel',
        title: 'Cancel Order',
        description: 'Cancel an order with optional payment refund',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Order UUID' }],
        requestBody: { refundPayment: true },
        responses: [
          {
            status: 200,
            description: 'Order cancelled',
            example: { success: true, data: { orderStatus: 'cancelled' } },
          },
          {
            status: 400,
            description: 'Cancellation failed',
            example: { success: false, message: 'Cancellation failed' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Providers',
    icon: Server,
    description: 'eSIM provider management and synchronization',
    basePath: '/api/admin/providers',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/providers',
        title: 'List All Providers',
        description: 'Get all configured eSIM providers',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Providers fetched',
            example: {
              success: true,
              data: [{ id: 'uuid', name: 'Airalo', slug: 'airalo', enabled: true }],
            },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/providers',
        title: 'Create Provider',
        description: 'Add a new eSIM provider',
        auth: 'admin',
        requestBody: {
          name: 'New Provider',
          slug: 'new-provider',
          apiBaseUrl: 'https://api.provider.com',
          pricingMargin: '20',
        },
        responses: [
          {
            status: 201,
            description: 'Provider created',
            example: { success: true, data: { provider: { id: 'uuid' } } },
          },
          {
            status: 400,
            description: 'Invalid request',
            example: { success: false, message: 'Name and slug are required' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/providers/:id',
        title: 'Update Provider',
        description: 'Update provider settings including margin and sync interval',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Provider UUID' }],
        requestBody: {
          name: 'Airalo',
          enabled: true,
          pricingMargin: '25',
          isPreferred: true,
          syncIntervalMinutes: 60,
        },
        responses: [
          {
            status: 200,
            description: 'Provider updated',
            example: { success: true, data: { id: 'uuid' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Provider not found' },
          },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/admin/providers/:id',
        title: 'Delete Provider',
        description: 'Remove a provider from the system',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Provider UUID' }],
        responses: [
          {
            status: 200,
            description: 'Provider deleted',
            example: { success: true, message: 'Provider deleted successfully' },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Provider not found' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/providers/:id/sync',
        title: 'Sync Provider Packages',
        description: 'Manually trigger package synchronization for a provider',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Provider UUID' }],
        responses: [
          {
            status: 200,
            description: 'Sync started',
            example: { success: true, data: { providerId: 'uuid' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Provider not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Settings',
    icon: Settings,
    description: 'Platform configuration and currency management',
    basePath: '/api/admin/settings',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/settings',
        title: 'Get All Settings',
        description: 'Get all platform settings',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Settings fetched',
            example: { success: true, data: [{ key: 'pricing_margin', value: '20' }] },
          },
        ],
      },
      {
        method: 'PUT',
        path: '/api/admin/settings/:key',
        title: 'Update Setting',
        description: 'Update a specific platform setting',
        auth: 'admin',
        pathParams: [{ name: 'key', type: 'string', description: 'Setting key' }],
        requestBody: { value: '25', category: 'pricing' },
        responses: [
          {
            status: 200,
            description: 'Setting updated',
            example: { success: true, data: { key: 'pricing_margin', value: '25' } },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/settings/currencies',
        title: 'List Currencies',
        description: 'Get all supported currencies',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Currencies fetched',
            example: {
              success: true,
              data: [{ code: 'USD', name: 'US Dollar', conversionRate: '1.00' }],
            },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/settings/currencies',
        title: 'Create Currency',
        description: 'Add a new supported currency',
        auth: 'admin',
        requestBody: { code: 'GBP', name: 'British Pound', symbol: '£', conversionRate: '0.79' },
        responses: [
          {
            status: 201,
            description: 'Currency created',
            example: { success: true, data: { currency: { code: 'GBP' } } },
          },
          {
            status: 400,
            description: 'Invalid request',
            example: { success: false, message: 'Code, name, and conversion rate are required' },
          },
        ],
      },
      {
        method: 'PUT',
        path: '/api/admin/settings/currencies/:id',
        title: 'Update Currency',
        description: 'Update currency details and conversion rate',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Currency UUID' }],
        requestBody: { conversionRate: '0.80', isEnabled: true },
        responses: [
          {
            status: 200,
            description: 'Currency updated',
            example: { success: true, data: { code: 'GBP' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Currency not found' },
          },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/admin/settings/currencies/:id',
        title: 'Delete Currency',
        description: 'Remove a currency from the system',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Currency UUID' }],
        responses: [
          {
            status: 200,
            description: 'Currency deleted',
            example: { success: true, message: 'Currency deleted successfully' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Platform Settings',
    icon: Settings,
    description: 'Platform-wide configuration options',
    basePath: '/api/admin/platform-settings',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/platform-settings',
        title: 'Get Platform Settings',
        description: 'Get all platform settings as a key-value map',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Settings fetched',
            example: {
              success: true,
              data: { package_selection_mode: { value: 'auto', category: 'packages' } },
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/platform-settings/:key',
        title: 'Get Setting by Key',
        description: 'Get a specific platform setting',
        auth: 'admin',
        pathParams: [{ name: 'key', type: 'string', description: 'Setting key' }],
        responses: [
          {
            status: 200,
            description: 'Setting found',
            example: { success: true, data: { key: 'package_selection_mode', value: 'auto' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: "Setting 'xxx' not found" },
          },
        ],
      },
      {
        method: 'PUT',
        path: '/api/admin/platform-settings/:key',
        title: 'Update Platform Setting',
        description: 'Update a platform setting value',
        auth: 'admin',
        pathParams: [{ name: 'key', type: 'string', description: 'Setting key' }],
        requestBody: { value: 'manual' },
        responses: [
          {
            status: 200,
            description: 'Setting updated',
            example: { success: true, data: { key: 'package_selection_mode', value: 'manual' } },
          },
          {
            status: 400,
            description: 'Value required',
            example: { success: false, message: 'Value is required' },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: "Setting 'xxx' not found" },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/platform-settings/run-auto-selection',
        title: 'Run Auto Selection',
        description: 'Manually trigger package auto-selection based on best prices',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Auto-selection completed',
            example: { success: true, message: 'Auto-selection completed' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Vouchers',
    icon: Gift,
    description: 'Discount voucher management',
    basePath: '/api/admin/vouchers',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/vouchers',
        title: 'List All Vouchers',
        description: 'Get all vouchers with usage statistics',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Vouchers fetched',
            example: {
              success: true,
              vouchers: [{ id: 'uuid', code: 'SAVE20', type: 'percentage', value: '20' }],
              statistics: { totalVouchers: 5, activeVouchers: 3 },
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/vouchers/:id',
        title: 'Get Voucher Details',
        description: 'Get a specific voucher by ID',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Voucher UUID' }],
        responses: [
          {
            status: 200,
            description: 'Voucher found',
            example: { success: true, voucher: { id: 'uuid', code: 'SAVE20' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Voucher not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/vouchers/:id/usage',
        title: 'Get Voucher Usage',
        description: 'Get usage history for a voucher',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Voucher UUID' }],
        responses: [
          {
            status: 200,
            description: 'Usage fetched',
            example: {
              success: true,
              usage: [{ userId: 'uuid', orderId: 'uuid', discountAmount: '5.00' }],
            },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/vouchers',
        title: 'Create Voucher',
        description: 'Create a new discount voucher',
        auth: 'admin',
        requestBody: {
          code: 'SUMMER25',
          type: 'percentage',
          value: 25,
          validFrom: '2025-06-01',
          validUntil: '2025-08-31',
          maxUses: 100,
        },
        responses: [
          {
            status: 201,
            description: 'Voucher created',
            example: { success: true, voucher: { id: 'uuid', code: 'SUMMER25' } },
          },
          {
            status: 400,
            description: 'Validation error',
            example: { success: false, message: 'Voucher code already exists' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/vouchers/:id',
        title: 'Update Voucher',
        description: 'Update voucher settings',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Voucher UUID' }],
        requestBody: { status: 'inactive', maxUses: 200 },
        responses: [
          {
            status: 200,
            description: 'Voucher updated',
            example: { success: true, voucher: { id: 'uuid' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Voucher not found' },
          },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/admin/vouchers/:id',
        title: 'Delete Voucher',
        description: 'Delete a voucher and its usage history',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Voucher UUID' }],
        responses: [
          {
            status: 200,
            description: 'Voucher deleted',
            example: { success: true, message: 'Voucher deleted' },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Voucher not found' },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Gift Cards',
    icon: CreditCard,
    description: 'Gift card management',
    basePath: '/api/admin/gift-cards',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/gift-cards',
        title: 'List All Gift Cards',
        description: 'Get all gift cards with statistics',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Gift cards fetched',
            example: {
              success: true,
              giftCards: [{ id: 'uuid', code: 'GC-XXXX-XXXX', amount: '50.00', balance: '50.00' }],
              statistics: { totalCards: 10, activeCards: 8 },
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/gift-cards/:id',
        title: 'Get Gift Card Details',
        description: 'Get a specific gift card',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Gift Card UUID' }],
        responses: [
          {
            status: 200,
            description: 'Gift card found',
            example: { success: true, giftCard: { id: 'uuid', code: 'GC-XXXX-XXXX' } },
          },
          {
            status: 404,
            description: 'Not found',
            example: { success: false, message: 'Gift card not found' },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/gift-cards/:id/transactions',
        title: 'Get Gift Card Transactions',
        description: 'Get transaction history for a gift card',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Gift Card UUID' }],
        responses: [
          {
            status: 200,
            description: 'Transactions fetched',
            example: { success: true, transactions: [] },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/gift-cards',
        title: 'Create Gift Card',
        description: 'Create a new gift card',
        auth: 'admin',
        requestBody: {
          amount: 50,
          recipientEmail: 'recipient@example.com',
          recipientName: 'John',
          message: 'Happy Birthday!',
          theme: 'birthday',
        },
        responses: [
          {
            status: 201,
            description: 'Gift card created',
            example: { success: true, giftCard: { id: 'uuid', code: 'GC-XXXX-XXXX' } },
          },
          {
            status: 400,
            description: 'Validation error',
            example: { success: false, message: 'Gift card code already exists' },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/gift-cards/bulk',
        title: 'Bulk Create Gift Cards',
        description: 'Create multiple gift cards at once (max 100)',
        auth: 'admin',
        requestBody: { count: 10, amount: 25 },
        responses: [
          {
            status: 201,
            description: 'Gift cards created',
            example: { success: true, created: 10, giftCards: [] },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/gift-cards/:id/send',
        title: 'Send Gift Card Email',
        description: 'Send delivery email for a gift card',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Gift Card UUID' }],
        responses: [
          {
            status: 200,
            description: 'Email sent',
            example: { success: true, message: 'Gift card delivery email sent' },
          },
          {
            status: 400,
            description: 'No recipient',
            example: { success: false, message: 'No recipient email set' },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/gift-cards/:id/cancel',
        title: 'Cancel Gift Card',
        description: 'Cancel an active gift card',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Gift Card UUID' }],
        responses: [
          {
            status: 200,
            description: 'Gift card cancelled',
            example: { success: true, giftCard: { status: 'cancelled' } },
          },
          {
            status: 400,
            description: 'Cannot cancel',
            example: { success: false, message: 'Cannot cancel a used gift card' },
          },
        ],
      },
    ],
  },
  {
    name: 'Payments',
    icon: CreditCard,
    description: 'Payment initialization and processing for checkout',
    basePath: '/api/payments',
    endpoints: [
      {
        method: 'GET',
        path: '/api/payments/gateways',
        title: 'Get Available Gateways',
        description: 'Get enabled payment gateways for checkout based on currency',
        auth: 'public',
        queryParams: [{ name: 'currency', type: 'string', description: 'Currency code to filter by (e.g., USD)', required: false }],
        responses: [
          {
            status: 200,
            description: 'Gateways fetched',
            example: { success: true, data: [{ provider: 'stripe', displayName: 'Credit Card' }] },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/payments/init',
        title: 'Initialize Payment',
        description: 'Initialize payment gateway session or intent',
        auth: 'public',
        requestBody: { gatewayId: 'uuid', packageId: 'uuid', quantity: 1, currency: 'USD', orderId: 'uuid', email: 'user@example.com' },
        responses: [
          {
            status: 200,
            description: 'Payment initialized',
            example: { success: true, payment: { clientSecret: 'pi_3M...' } },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Payment Gateways',
    icon: CreditCard,
    description: 'Configure and manage active payment gateways',
    basePath: '/api/admin/payment-gateways',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/payment-gateways',
        title: 'List All Gateways',
        description: 'Get all configured payment gateways',
        auth: 'admin',
        responses: [
          {
            status: 200,
            description: 'Gateways fetched',
            example: { success: true, data: [{ id: 'uuid', provider: 'stripe', isEnabled: true }] },
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/admin/payment-gateways/:id',
        title: 'Update Gateway',
        description: 'Update gateway credentials or completely enable/disable them',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Gateway UUID' }],
        requestBody: { isEnabled: true, publicKey: 'pk_test...', secretKey: 'sk_test...' },
        responses: [
          {
            status: 200,
            description: 'Gateway updated',
            example: { success: true, data: { id: 'uuid' } },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Content Management',
    icon: Book,
    description: 'Manage static pages, FAQs, policies, and terms',
    basePath: '/api/admin',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/pages',
        title: 'List Pages',
        description: 'Get list of managed static pages',
        auth: 'admin',
        responses: [
          { status: 200, description: 'Pages fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/faqs',
        title: 'List FAQs',
        description: 'Get all dynamically configured FAQs used in the site',
        auth: 'admin',
        responses: [
          { status: 200, description: 'FAQs fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/faqs',
        title: 'Create FAQ',
        description: 'Create a new FAQ entry from Admin Panel',
        auth: 'admin',
        requestBody: { question: 'What is an eSIM?', answer: 'It is a digital SIM...', order: 1 },
        responses: [
          { status: 201, description: 'FAQ created', example: { success: true, data: { id: 'uuid' } } },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/privacy-policy',
        title: 'Get Privacy Policies',
        description: 'Get all privacy policy versions',
        auth: 'admin',
        responses: [
          { status: 200, description: 'Privacy policies fetched' },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/privacy-policy',
        title: 'Create Privacy Policy',
        description: 'Publish a new privacy policy version',
        auth: 'admin',
        requestBody: { content: 'Privacy policy text...' },
        responses: [
          { status: 201, description: 'Privacy policy created' },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/terms-conditions',
        title: 'Get Terms & Conditions',
        description: 'Get all terms and conditions versions',
        auth: 'admin',
        responses: [
          { status: 200, description: 'Terms & conditions fetched' },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/terms-conditions',
        title: 'Create Terms & Conditions',
        description: 'Publish a new terms and conditions version',
        auth: 'admin',
        requestBody: { content: 'Terms and conditions text...' },
        responses: [
          { status: 201, description: 'Terms & conditions created' },
        ],
      },
    ],
  },
  {
    name: 'Admin Blog & Articles',
    icon: MessageSquare,
    description: 'Manage blog posts, announcements, and articles',
    basePath: '/api/admin/blog',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/blog',
        title: 'List Blog Posts',
        description: 'Get a list of all current blog posts and drafts',
        auth: 'admin',
        responses: [
          { status: 200, description: 'Blog posts fetched', example: { success: true, data: [] } },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/blog',
        title: 'Create Blog Post',
        description: 'Draft or publish a new blog entry',
        auth: 'admin',
        requestBody: { title: 'New Destination Launched', content: '<p>Body text</p>', published: true },
        responses: [
          { status: 201, description: 'Post created', example: { success: true, data: { id: 'uuid' } } },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/admin/blog/:id',
        title: 'Delete Blog Post',
        description: 'Targeted deletion of a redundant blog post',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'uuid', description: 'Post UUID' }],
        responses: [
          { status: 200, description: 'Post deleted', example: { success: true, message: 'Deleted' } },
        ],
      },
    ],
  },
  {
    name: 'Banners Management',
    icon: Smartphone,
    description: 'Endpoints for managing global promotion banners',
    basePath: '/api/banner',
    endpoints: [
      {
        method: 'GET',
        path: '/api/banner',
        title: 'List Banners',
        description: 'Get currently active and inactive promotion banners',
        auth: 'public',
        responses: [
          { status: 200, description: 'Banners fetched', example: { success: true, data: [] } },
        ],
      },
    ],
  },
  {
    name: 'Admin Data Imports',
    icon: Users,
    description: 'Bulk import tools for users and Packages',
    basePath: '/api/admin',
    endpoints: [
      {
        method: 'POST',
        path: '/api/admin/customers/import',
        title: 'Import Users from CSV',
        description: 'Bulk import users with pending KYC status from an external CSV file',
        auth: 'admin',
        requestBody: { file: 'Binary CSV file data' },
        responses: [
          { status: 200, description: 'Users imported', example: { success: true, data: { imported: 15 } } },
        ],
      },
    ],
  },
  {
    name: 'Admin Price Brackets',
    icon: CreditCard,
    description: 'Manage price brackets for IAP products and automated pricing',
    basePath: '/api/admin/price-brackets',
    endpoints: [
      {
        method: 'POST',
        path: '/api/admin/price-brackets/generate',
        title: 'Generate Price Brackets',
        description:
          'Generate price brackets for a specific currency based on existing retail prices of unified Packages.',
        auth: 'admin',
        requestBody: { currency: 'USD', priceDiff: 1, packagePrefix: 'esimtel' },
        responses: [
          {
            status: 200,
            description: 'Price brackets generated and synced',
            example: {
              success: true,
              data: { total: 50, android: { success: 45, failed: 5 }, apple: { success: 48, failed: 2 } },
            },
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/admin/price-brackets/list',
        title: 'List Price Brackets',
        description: 'Fetch paginated list of price brackets filtered by currency',
        auth: 'admin',
        queryParams: [
          { name: 'page', type: 'number', description: 'Page number' },
          { name: 'limit', type: 'number', description: 'Items per page' },
          { name: 'currency', type: 'string', description: 'Filter by currency' },
        ],
        responses: [
          {
            status: 200,
            description: 'Price brackets list',
            example: { success: true, data: { page: 1, limit: 20, total: 100, data: [] } },
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/admin/price-brackets/preview',
        title: 'Preview Price Brackets',
        description: 'Preview the brackets that would be generated without actually creating them',
        auth: 'admin',
        requestBody: { currency: 'USD', priceDiff: 1, packagePrefix: 'esimtel' },
        responses: [
          {
            status: 200,
            description: 'Preview generated',
            example: { success: true, data: { currency: 'USD', totalBrackets: 50, data: [] } },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Screenshot',
    icon: Smartphone,
    description: 'Generate screenshots for marketing and IAP product listings',
    basePath: '/api/admin/screenshot',
    endpoints: [
      {
        method: 'POST',
        path: '/api/admin/screenshot',
        title: 'Generate Screenshot',
        description: 'Generate product screenshots based on package data',
        auth: 'admin',
        requestBody: {
          products: [
            {
              showIap: true,
              appName: 'Esimtel',
              product: {
                name: 'pkg_USD_10_20',
                price: 19.99,
                currency: 'USD',
                description: 'eSIM in 30 seconds',
                slug: 'pkg_usd_19_99',
              },
            },
          ],
        },
        responses: [
          {
            status: 200,
            description: 'Screenshots generated',
            example: { success: true, images: ['/uploads/screenshots/example.png'] },
          },
        ],
      },
    ],
  },
  {
    name: 'Admin Support Tickets',
    icon: MessageSquare,
    description: 'Manage and respond to customer support tickets',
    basePath: '/api/admin/support-tickets',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/support-tickets',
        title: 'List All Tickets',
        description: 'Fetch all support tickets with filtering by status and priority',
        auth: 'admin',
        queryParams: [
          {
            name: 'status',
            type: 'string',
            description: 'Filter by status (open, pending, closed, resolved)',
          },
          { name: 'priority', type: 'string', description: 'Filter by priority (low, medium, high)' },
          { name: 'search', type: 'string', description: 'Search tickets' },
        ],
        responses: [{ status: 200, description: 'Tickets fetched' }],
      },
      {
        method: 'GET',
        path: '/api/admin/support-tickets/:id',
        title: 'Get Ticket Details',
        description: 'Fetch a single ticket including its messages and replies',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'string', description: 'Ticket ID' }],
        responses: [{ status: 200, description: 'Ticket fetched' }],
      },
      {
        method: 'POST',
        path: '/api/admin/support-tickets/:id/messages',
        title: 'Add Ticket Message',
        description: 'Send a reply to a customer ticket or add an internal note',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'string', description: 'Ticket ID' }],
        requestBody: { message: 'Hello, how can I help you?', isInternal: false },
        responses: [{ status: 201, description: 'Message added' }],
      },
      {
        method: 'DELETE',
        path: '/api/admin/support-tickets/:id',
        title: 'Delete Ticket',
        description: 'Firmly delete a ticket and all its messages',
        auth: 'admin',
        pathParams: [{ name: 'id', type: 'string', description: 'Ticket ID' }],
        responses: [{ status: 200, description: 'Ticket deleted' }],
      },
    ],
  },
];

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const authBadges = {
  public: {
    label: 'Public',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  user: {
    label: 'Auth Required',
    className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  admin: {
    label: 'Admin Only',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function EndpointCard({
  endpoint,
  onCopy,
  copiedPath,
}: {
  endpoint: ApiEndpoint;
  onCopy: (text: string, path: string) => void;
  copiedPath: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const curlExample = useMemo(() => {
    let curl = `curl -X ${endpoint.method} "${API_BASE_URL}${endpoint.path}"`;
    if (endpoint.path.startsWith('/api/v1')) {
      curl += ` \\\n  -H "X-API-Key: esim_your_api_key_here"`;
      curl += ` \\\n  -H "X-API-Secret: your_api_secret_here"`;
    } else if (endpoint.auth !== 'public') {
      curl += ` \\\n  -H "Cookie: session=YOUR_SESSION_COOKIE"`;
    }
    if (endpoint.requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '${JSON.stringify(endpoint.requestBody)}'`;
    }
    return curl;
  }, [endpoint]);

  return (
    <Card className="overflow-hidden border hover:border-primary/30 transition-colors">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div
            className="p-4 cursor-pointer flex items-center gap-3 hover:bg-muted/50 transition-colors"
            data-testid={`endpoint-${endpoint.method}-${endpoint.path.replace(/\//g, '-')}`}
          >
            <Badge
              className={`${methodColors[endpoint.method]} font-mono text-xs min-w-16 justify-center`}
            >
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono text-foreground flex-1 truncate">
              {endpoint.path}
            </code>
            <Badge variant="outline" className={authBadges[endpoint.auth].className}>
              {authBadges[endpoint.auth].label}
            </Badge>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
            <div className="pt-4">
              <h4 className="font-semibold text-foreground">{endpoint.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{endpoint.description}</p>
            </div>

            {endpoint.pathParams && endpoint.pathParams.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Path Parameters</h5>
                <div className="space-y-1">
                  {endpoint.pathParams.map((param) => (
                    <div key={param.name} className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{param.name}</code>
                      <span className="text-muted-foreground text-xs">({param.type})</span>
                      <span className="text-muted-foreground">- {param.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {endpoint.queryParams && endpoint.queryParams.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Query Parameters</h5>
                <div className="space-y-1">
                  {endpoint.queryParams.map((param) => (
                    <div key={param.name} className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{param.name}</code>
                      <span className="text-muted-foreground text-xs">({param.type})</span>
                      {param.required && (
                        <Badge variant="outline" className="text-xs">
                          required
                        </Badge>
                      )}
                      <span className="text-muted-foreground">- {param.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {endpoint.requestBody && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Request Body</h5>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(endpoint.requestBody, null, 2)}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() =>
                      onCopy(JSON.stringify(endpoint.requestBody, null, 2), `${endpoint.path}-body`)
                    }
                    data-testid={`copy-body-${endpoint.path.replace(/\//g, '-')}`}
                  >
                    {copiedPath === `${endpoint.path}-body` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div>
              <h5 className="text-sm font-medium text-foreground mb-2">Responses</h5>
              <div className="space-y-2">
                {endpoint.responses.map((response) => (
                  <div key={response.status} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                      <Badge
                        variant={
                          response.status < 300
                            ? 'default'
                            : response.status < 500
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="font-mono"
                      >
                        {response.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{response.description}</span>
                    </div>
                    {response.example && (
                      <pre className="bg-slate-900 text-slate-100 p-3 text-xs overflow-x-auto">
                        {JSON.stringify(response.example, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-foreground mb-2">cURL Example</h5>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                  {curlExample}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => onCopy(curlExample, `${endpoint.path}-curl`)}
                  data-testid={`copy-curl-${endpoint.path.replace(/\//g, '-')}`}
                >
                  {copiedPath === `${endpoint.path}-curl` ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function APIDocsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [authFilter, setAuthFilter] = useState<string>('all');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(apiCategories.map((c) => c.name)),
  );

  const handleCopy = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    return apiCategories
      .map((category) => ({
        ...category,
        endpoints: category.endpoints.filter((endpoint) => {
          const matchesSearch =
            searchQuery === '' ||
            endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesMethod = methodFilter === 'all' || endpoint.method === methodFilter;
          const matchesAuth = authFilter === 'all' || endpoint.auth === authFilter;
          return matchesSearch && matchesMethod && matchesAuth;
        }),
      }))
      .filter((category) => category.endpoints.length > 0);
  }, [searchQuery, methodFilter, authFilter]);

  const totalEndpoints = apiCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0);
  const filteredEndpoints = filteredCategories.reduce((sum, cat) => sum + cat.endpoints.length, 0);

  return (
    <div className="admin-light-surface p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 flex-col md:flex-row">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-gradient shadow-lg">
            <Code className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className=" text-2xl md:text-3xl font-bold text-foreground">API Documentation</h1>
            <p className="text-muted-foreground">
              {totalEndpoints} endpoints across {apiCategories.length} categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
          >
            Base URL: {API_BASE_URL}
          </Badge>
        </div>
      </div>

      <Card className="border-2 border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search endpoints by path, title, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-endpoints"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-36" data-testid="select-method-filter">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={authFilter} onValueChange={setAuthFilter}>
              <SelectTrigger className="w-full md:w-40" data-testid="select-auth-filter">
                <SelectValue placeholder="Auth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Auth Levels</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="user">Auth Required</SelectItem>
                <SelectItem value="admin">Admin Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || methodFilter !== 'all' || authFilter !== 'all') && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing {filteredEndpoints} of {totalEndpoints} endpoints
            </p>
          )}
        </CardContent>
      </Card>

      {/* Partner API Authentication Guide */}
      <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Zap className="h-5 w-5" />
            Partner API Authentication Guide
          </CardTitle>
          <CardDescription>
            Use these Credentials to Access the External Partner API (v1) for mobile apps and
            partner integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Getting API Keys */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-600" />
              Step 1: Get Your API Keys
            </h3>
            <div className="bg-white dark:bg-slate-900 border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Generate API keys from the Admin Panel:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>
                  Go to <strong>Platform Setup</strong> &gt; <strong>Failover & API</strong>
                </li>
                <li>
                  Click on the <strong>API Keys</strong> tab
                </li>
                <li>
                  Click <strong>Create New API Key</strong>
                </li>
                <li>
                  Save both the{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">API Key</code> and{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">API Secret</code> - the
                  secret is only shown once!
                </li>
              </ol>
            </div>
          </div>

          {/* Required Headers */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              Step 2: Use Required Headers
            </h3>
            <div className="bg-white dark:bg-slate-900 border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">
                All Partner API requests require <strong>both</strong> headers:
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <code className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    X-API-Key
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API Key (starts with sk_live_)
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <code className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    X-API-Secret
                  </code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API Secret (keep this secure!)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Code className="h-4 w-4 text-amber-600" />
              Code Examples
            </h3>
            <div className="space-y-4">
              {/* cURL */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    cURL
                  </Badge>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {`curl -X GET "${API_BASE_URL}/api/v1/packages" \\
  -H "X-API-Key: sk_live_your_api_key_here" \\
  -H "X-API-Secret: your_secret_here"`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-white"
                    onClick={() =>
                      handleCopy(
                        `curl -X GET "${API_BASE_URL}/api/v1/packages" \\\n  -H "X-API-Key: sk_live_your_api_key_here" \\\n  -H "X-API-Secret: your_secret_here"`,
                        'curl-example',
                      )
                    }
                    data-testid="copy-curl-auth-example"
                  >
                    {copiedPath === 'curl-example' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* JavaScript */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    JavaScript / Node.js
                  </Badge>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {`const response = await fetch('${API_BASE_URL}/api/v1/packages', {
  method: 'GET',
  headers: {
    'X-API-Key': 'sk_live_your_api_key_here',
    'X-API-Secret': 'your_secret_here',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-white"
                    onClick={() =>
                      handleCopy(
                        `const response = await fetch('${API_BASE_URL}/api/v1/packages', {\n  method: 'GET',\n  headers: {\n    'X-API-Key': 'sk_live_your_api_key_here',\n    'X-API-Secret': 'your_secret_here',\n    'Content-Type': 'application/json'\n  }\n});\nconst data = await response.json();`,
                        'js-example',
                      )
                    }
                    data-testid="copy-js-auth-example"
                  >
                    {copiedPath === 'js-example' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Python */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    Python
                  </Badge>
                </div>
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {`import requests

response = requests.get(
    '${API_BASE_URL}/api/v1/packages',
    headers={
        'X-API-Key': 'sk_live_your_api_key_here',
        'X-API-Secret': 'your_secret_here'
    }
)
data = response.json()`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-white"
                    onClick={() =>
                      handleCopy(
                        `import requests\n\nresponse = requests.get(\n    '${API_BASE_URL}/api/v1/packages',\n    headers={\n        'X-API-Key': 'sk_live_your_api_key_here',\n        'X-API-Secret': 'your_secret_here'\n    }\n)\ndata = response.json()`,
                        'python-example',
                      )
                    }
                    data-testid="copy-python-auth-example"
                  >
                    {copiedPath === 'python-example' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Failover Note */}
          <div className="bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/30 dark:to-indigo-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/50 shrink-0">
                <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h4 className="font-semibold text-teal-700 dark:text-teal-400">
                  Smart Failover Enabled
                </h4>
                <p className="text-sm text-teal-600/80 dark:text-teal-400/80 mt-1">
                  All Orders placed through the Partner API automatically use smart failover. If the
                  primary provider fails, the system will try backup providers to ensure your order
                  is completed. Check the{' '}
                  <code className="bg-teal-100 dark:bg-teal-900/50 px-1 rounded">failoverUsed</code>{' '}
                  field in the response to see if a backup provider was used.
                </p>
              </div>
            </div>
          </div>

          {/* Error Codes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Common Error Codes</h3>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Badge variant="destructive" className="font-mono">
                  401
                </Badge>
                <span className="text-sm">Missing or invalid API credentials</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Badge variant="destructive" className="font-mono">
                  403
                </Badge>
                <span className="text-sm">API key disabled or expired</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Badge className="bg-amber-500 font-mono">400</Badge>
                <span className="text-sm">Invalid request parameters</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Badge className="bg-amber-500 font-mono">404</Badge>
                <span className="text-sm">Resource not found</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 lg:gap-8">
        {/* Sidebar - Full width on mobile/tablet, fixed width on desktop */}
        <Card className="h-fit lg:sticky lg:top-4 order-2 lg:order-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Book className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Responsive ScrollArea height */}
            <ScrollArea className="h-[280px] sm:h-[350px] lg:h-[calc(100vh-300px)]">
              <div className="px-3 sm:px-4 pb-4 space-y-1">
                {filteredCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.name}
                      variant="ghost"
                      className="w-full justify-start gap-2 h-auto py-2 px-2 text-xs sm:text-sm"
                      onClick={() => {
                        const element = document.getElementById(
                          `category-${category.name.replace(/\s+/g, '-')}`,
                        );
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      data-testid={`nav-category-${category.name.replace(/\s+/g, '-')}`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{category.name}</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5">
                        {category.endpoints.length}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content - Always full width */}
        <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategories.has(category.name);
            return (
              <div
                key={category.name}
                id={`category-${category.name.replace(/\s+/g, '-')}`}
                className="scroll-mt-12 sm:scroll-mt-16"
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.name)}>
                  <CollapsibleTrigger asChild>
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 cursor-pointer group p-4 sm:p-0 hover:bg-muted/50 rounded-lg sm:rounded-none transition-all"
                      data-testid={`toggle-category-${category.name.replace(/\s+/g, '-')}`}
                    >
                      <div className="flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                          {category.name}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                          {category.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-auto">
                        <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
                          {category.endpoints.length} endpoints
                        </Badge>
                        <div className="sm:hidden">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3 ml-0 sm:ml-[52px] pt-4">
                      {category.endpoints.map((endpoint) => (
                        <EndpointCard
                          key={`${endpoint.method}-${endpoint.path}`}
                          endpoint={endpoint}
                          onCopy={handleCopy}
                          copiedPath={copiedPath}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <Separator className="my-6 sm:mt-6" />
              </div>
            );
          })}

          {/* Empty State - Responsive */}
          {filteredCategories.length === 0 && (
            <Card className="p-8 sm:p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                No endpoints found
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                Try adjusting your search or filter criteria
              </p>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-teal-600" />
            Response Format & Status Codes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Standard Response Format</h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
              {`{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}`}
            </pre>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-3">HTTP Status Codes</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Badge className="bg-emerald-500">200</Badge>
                <span className="text-sm">OK - Request succeeded</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <Badge className="bg-teal-500">201</Badge>
                <span className="text-sm">Created - Resource created successfully</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Badge className="bg-amber-500">400</Badge>
                <span className="text-sm">Bad Request - Invalid input or validation error</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Badge className="bg-orange-500">401</Badge>
                <span className="text-sm">Unauthorized - Authentication required</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Badge className="bg-red-500">403</Badge>
                <span className="text-sm">Forbidden - Access denied</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <Badge className="bg-teal-500">404</Badge>
                <span className="text-sm">Not Found - Resource does not exist</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Badge className="bg-slate-500">500</Badge>
                <span className="text-sm">Internal Server Error - Server-side error</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Sessions are managed via HTTP-only cookies. After successful OTP/password
              verification, all subsequent requests automatically include the session cookie. No
              manual token management required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
