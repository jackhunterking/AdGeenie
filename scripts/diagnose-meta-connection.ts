/**
 * Diagnostic Script: Check Meta Connection Data
 * Purpose: Verify if Meta connection data is being saved to Supabase
 * 
 * Usage: 
 * 1. Replace CAMPAIGN_ID with your actual campaign ID
 * 2. Run: npx tsx scripts/diagnose-meta-connection.ts
 */

import { createClient } from '@supabase/supabase-js'

// Get campaign ID from command line or use default
const campaignId = process.argv[2]

if (!campaignId) {
  console.error('❌ Please provide a campaign ID as argument')
  console.error('Usage: npx tsx scripts/diagnose-meta-connection.ts YOUR_CAMPAIGN_ID')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnose() {
  console.log('\n🔍 Meta Connection Diagnostic Report')
  console.log('=====================================\n')
  console.log(`Campaign ID: ${campaignId}\n`)

  // Check 1: Campaign exists
  console.log('📋 Step 1: Checking if campaign exists...')
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, user_id, created_at')
    .eq('id', campaignId)
    .single()

  if (campaignError) {
    console.error('❌ Campaign not found:', campaignError.message)
    return
  }

  console.log('✅ Campaign found:')
  console.log('   Name:', campaign.name)
  console.log('   User ID:', campaign.user_id)
  console.log('   Created:', campaign.created_at)
  console.log()

  // Check 2: Meta connection data
  console.log('📋 Step 2: Checking campaign_meta_connections table...')
  const { data: connection, error: connError } = await supabase
    .from('campaign_meta_connections')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (connError) {
    console.error('❌ Error fetching connection:', connError.message)
  } else if (!connection) {
    console.log('⚠️  No connection record found')
  } else {
    console.log('✅ Connection record exists:')
    console.log('   Business ID:', connection.selected_business_id || '(none)')
    console.log('   Business Name:', connection.selected_business_name || '(none)')
    console.log('   Page ID:', connection.selected_page_id || '(none)')
    console.log('   Page Name:', connection.selected_page_name || '(none)')
    console.log('   Instagram ID:', connection.selected_ig_user_id || '(none)')
    console.log('   Instagram Username:', connection.selected_ig_username || '(none)')
    console.log('   Ad Account ID:', connection.selected_ad_account_id || '(none)')
    console.log('   Ad Account Name:', connection.selected_ad_account_name || '(none)')
    console.log('   Payment Connected:', connection.ad_account_payment_connected || false)
    console.log('   Token Present:', connection.long_lived_user_token ? 'Yes' : 'No')
    console.log('   Created:', connection.created_at)
    console.log('   Updated:', connection.updated_at)
  }
  console.log()

  // Check 3: Campaign state
  console.log('📋 Step 3: Checking campaign_states table...')
  const { data: state, error: stateError } = await supabase
    .from('campaign_states')
    .select('meta_connect_data, campaign_id')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (stateError) {
    console.error('❌ Error fetching state:', stateError.message)
  } else if (!state) {
    console.log('⚠️  No state record found')
  } else {
    console.log('✅ State record exists:')
    if (state.meta_connect_data) {
      console.log('   Meta Connect Data:', JSON.stringify(state.meta_connect_data, null, 2))
    } else {
      console.log('   Meta Connect Data: (empty)')
    }
  }
  console.log()

  // Check 4: What the selection API would return
  console.log('📋 Step 4: Simulating /api/meta/selection response...')
  const apiResponse = {
    business: connection?.selected_business_id ? { 
      id: connection.selected_business_id, 
      name: connection.selected_business_name 
    } : undefined,
    page: connection?.selected_page_id ? { 
      id: connection.selected_page_id, 
      name: connection.selected_page_name 
    } : undefined,
    instagram: connection?.selected_ig_user_id ? { 
      id: connection.selected_ig_user_id, 
      username: connection.selected_ig_username 
    } : null,
    adAccount: connection?.selected_ad_account_id ? { 
      id: connection.selected_ad_account_id, 
      name: connection.selected_ad_account_name 
    } : undefined,
    paymentConnected: Boolean(connection?.ad_account_payment_connected),
    status: (state?.meta_connect_data as { status?: string })?.status || 'disconnected',
  }

  console.log('   API would return:', JSON.stringify(apiResponse, null, 2))
  console.log()

  // Summary
  console.log('📊 Summary')
  console.log('==========')
  const hasConnection = !!connection
  const hasBusiness = !!connection?.selected_business_id
  const hasPage = !!connection?.selected_page_id
  const hasAdAccount = !!connection?.selected_ad_account_id
  const hasState = !!state?.meta_connect_data

  console.log('   Campaign exists:', '✓')
  console.log('   Connection record:', hasConnection ? '✓' : '✗')
  console.log('   Business data:', hasBusiness ? '✓' : '✗')
  console.log('   Page data:', hasPage ? '✓' : '✗')
  console.log('   Ad Account data:', hasAdAccount ? '✓' : '✗')
  console.log('   State record:', hasState ? '✓' : '✗')
  console.log()

  if (!hasConnection) {
    console.log('❌ ISSUE IDENTIFIED: No connection record exists')
    console.log('   → The OAuth callback may be failing to save data')
    console.log('   → Check server logs for errors during callback')
  } else if (!hasBusiness && !hasPage && !hasAdAccount) {
    console.log('⚠️  ISSUE IDENTIFIED: Connection exists but has no data')
    console.log('   → The OAuth callback may be saving empty values')
    console.log('   → Check if Meta API is returning data')
  } else {
    console.log('✅ Data exists in database!')
    console.log('   → The issue is likely in the UI refresh logic')
    console.log('   → Check browser console for hydrate() calls')
    console.log('   → Verify the ?meta=connected redirect is working')
  }
  console.log()
}

diagnose().catch(console.error)

