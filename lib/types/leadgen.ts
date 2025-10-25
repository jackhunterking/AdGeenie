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

/**
 * Feature: Instant Form unified types
 * Purpose: Share a single concrete shape between Create and Existing flows for preview/mapping
 * References:
 *  - Graph API leadgen_forms questions: https://developers.facebook.com/docs/marketing-api/reference/page/leadgen_forms/
 */
export type InstantFormFieldType = "full_name" | "email" | "phone"

export interface InstantFormField {
  id: string
  type: InstantFormFieldType
  label: string
  required: boolean
}

export interface InstantFormData {
  id?: string
  name: string
  privacyUrl: string
  privacyLinkText: string
  fields: InstantFormField[]
}
