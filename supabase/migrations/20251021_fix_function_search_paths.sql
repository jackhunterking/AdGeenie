-- Migration: Fix function search_path vulnerabilities
-- Purpose: Set explicit search_path on all SECURITY DEFINER functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix update_conversation_updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE conversations
  SET updated_at = NOW(),
      message_count = (
        SELECT COUNT(*) FROM messages WHERE conversation_id = NEW.conversation_id
      )
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$function$;

-- Fix delete_expired_temp_prompts
CREATE OR REPLACE FUNCTION delete_expired_temp_prompts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.temp_prompts
  WHERE expires_at < timezone('utc'::text, now());
END;
$function$;

-- Fix handle_new_user_campaign
CREATE OR REPLACE FUNCTION handle_new_user_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_campaign_id UUID;
  temp_prompt_id UUID;
  prompt_record RECORD;
  campaign_name TEXT;
BEGIN
  -- Wrap everything in an exception handler so errors don't block user creation
  BEGIN
    -- Extract temp_prompt_id from user metadata
    temp_prompt_id := (NEW.raw_user_meta_data->>'temp_prompt_id')::UUID;
    
    -- Only create campaign if temp_prompt_id exists
    IF temp_prompt_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Fetch the prompt from temp_prompts table
    SELECT * INTO prompt_record
    FROM temp_prompts
    WHERE id = temp_prompt_id
      AND used = false
      AND expires_at > NOW();
    
    -- If prompt not found or expired, exit gracefully
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Create campaign name from prompt
    campaign_name := 'Campaign: ' || LEFT(prompt_record.prompt_text, 50);
    IF LENGTH(prompt_record.prompt_text) > 50 THEN
      campaign_name := campaign_name || '...';
    END IF;
    
    -- Create campaign with the prompt
    INSERT INTO campaigns (
      user_id, 
      name, 
      status, 
      current_step, 
      total_steps, 
      metadata, 
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id,
      campaign_name,
      'draft',
      1,
      6,
      jsonb_build_object('initialPrompt', prompt_record.prompt_text),
      NOW(),
      NOW()
    )
    RETURNING id INTO new_campaign_id;
    
    -- Create empty campaign state
    INSERT INTO campaign_states (
      campaign_id, 
      goal_data, 
      location_data, 
      audience_data, 
      ad_copy_data, 
      ad_preview_data, 
      budget_data
    )
    VALUES (
      new_campaign_id, 
      NULL, NULL, NULL, NULL, NULL, NULL
    );
    
    -- Mark temp prompt as used
    UPDATE temp_prompts
    SET used = true
    WHERE id = temp_prompt_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Failed to create campaign for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW to allow user creation
  RETURN NEW;
END;
$function$;

-- Drop deprecated get_image_variations (references non-existent generated_assets table)
DROP FUNCTION IF EXISTS get_image_variations(uuid, uuid);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed search_path for 4 functions and removed deprecated function';
END $$;

