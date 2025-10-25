/**
 * Feature: Facebook Leadgen Types
 * Purpose: Narrow types for leadgen form list/detail without using any
 * References:
 *  - Graph API leadgen_forms: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */

export interface LeadgenFormSummary {
  id: string
  name?: string
  created_time?: string
}

export interface LeadgenQuestion {
  type?: string
}

export interface LeadgenFormDetail {
  id: string
  name: string
  questions?: LeadgenQuestion[]
  privacy_policy_url?: string
  privacy_link_text?: string
}
