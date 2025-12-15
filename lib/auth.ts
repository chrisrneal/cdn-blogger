/**
 * Authorization utilities for API routes
 * 
 * Provides helper functions for checking user roles and permissions.
 */

import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface AuthContext {
  userId?: string;
  role?: string;
  isAuthenticated: boolean;
  isModerator: boolean;
  isAdmin: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

// In a real application, these would come from environment variables
// or a database. For now, we'll use a simple list.
// TODO: Replace with proper role management system
const MODERATOR_IDS = process.env.MODERATOR_USER_IDS?.split(',') || [];
const ADMIN_IDS = process.env.ADMIN_USER_IDS?.split(',') || [];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the authentication context from the request.
 * This is a simple implementation - in production you'd use proper JWT/session handling.
 */
export function getAuthContext(request: NextRequest): AuthContext {
  // In a real application, you would:
  // 1. Parse JWT token from Authorization header
  // 2. Verify the token with Supabase
  // 3. Extract user ID and role from the token
  
  // For now, we'll check for a simple header-based auth
  // This allows testing and gradual implementation of full auth
  const userId = request.headers.get('x-user-id') || undefined;
  const role = request.headers.get('x-user-role') || undefined;
  
  const isAuthenticated = !!userId;
  const isModerator = isAuthenticated && (
    role === 'moderator' || 
    role === 'admin' ||
    MODERATOR_IDS.includes(userId)
  );
  const isAdmin = isAuthenticated && (
    role === 'admin' ||
    ADMIN_IDS.includes(userId)
  );

  return {
    userId,
    role,
    isAuthenticated,
    isModerator,
    isAdmin,
  };
}

/**
 * Checks if the request has moderator or admin privileges.
 */
export function requireModerator(request: NextRequest): AuthContext {
  const auth = getAuthContext(request);
  
  if (!auth.isModerator && !auth.isAdmin) {
    throw new Error('Moderator or admin privileges required');
  }
  
  return auth;
}

/**
 * Checks if the request has admin privileges.
 */
export function requireAdmin(request: NextRequest): AuthContext {
  const auth = getAuthContext(request);
  
  if (!auth.isAdmin) {
    throw new Error('Admin privileges required');
  }
  
  return auth;
}

/**
 * Checks if the request is authenticated.
 */
export function requireAuth(request: NextRequest): AuthContext {
  const auth = getAuthContext(request);
  
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  return auth;
}
