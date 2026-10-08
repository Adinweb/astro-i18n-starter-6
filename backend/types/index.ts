/**
 * Backend Data Contracts & Transfer Objects (DTOs)
 * Decouples backend domain models and API responses from frontend views.
 */

export interface BackendHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
}

export interface SearchIndexItem {
  title: string;
  description: string;
  url: string;
  locale: string;
  group?: string;
  collection: 'pages' | 'blog';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
