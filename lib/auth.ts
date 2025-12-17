/**
 * Authorization utilities for API routes
 * 
 * Provides helper functions for checking user roles and permissions.
 * 
 * **SECURITY WARNING:**
 * This is a simplified implementation for development/testing purposes.
 * The current implementation uses simple headers (x-user-id, x-user-role) which
 * can be easily spoofed and is NOT secure for production use.
 * 
 * **For Production:**
 * 1. Implement proper JWT/session-based authentication using Supabase Auth
 * 2. Validate tokens on each request
 * 3. Store user roles in the database with proper access controls
 * 4. Use Supabase RLS policies to enforce authorization at the database level
 * 5. Consider using middleware for authentication/authorization checks
 * 
 * Example production implementation with Supabase:
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * 
 * export async function getAuthContext(request: NextRequest) {
 *   const token = request.headers.get('authorization')?.replace('Bearer ', '');
 *   const supabase = createClient(url, key);
 *   const { data: { user }, error } = await supabase.auth.getUser(token);
 *   
 *   if (error || !user) {
 *     return { isAuthenticated: false, isModerator: false, isAdmin: false };
 *   }
 *   
 *   // Fetch user role from database
 *   const { data: profile } = await supabase
 *     .from('user_profiles')
 *     .select('role')
 *     .eq('user_id', user.id)
 *     .single();
 *   
 *   return {
 *     userId: user.id,
 *     role: profile?.role,
 *     isAuthenticated: true,
 *     isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
 *     isAdmin: profile?.role === 'admin',
 *   };
 * }
 * ```
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
 * 
 * TEMPORARY: Currently allows any logged-in user to access review UI.
 * TODO: Restore proper moderator/admin check for production.
 */
export function requireModerator(request: NextRequest): AuthContext {
  const auth = getAuthContext(request);
  
  // TEMPORARY: Allow any logged-in user to access review UI
  if (!auth.isAuthenticated) {
    throw new Error('Authentication required');
  }
  
  // TODO: Uncomment for production to require actual moderator/admin privileges
  // if (!auth.isModerator && !auth.isAdmin) {
  //   throw new Error('Moderator or admin privileges required');
  // }
  
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
