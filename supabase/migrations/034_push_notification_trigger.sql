-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Function called after every new notification row to dispatch a push.
-- Reads the service role key from Supabase Vault (stored as 'service_role_key').
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  service_role_key TEXT;
BEGIN
  SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
   WHERE name = 'service_role_key'
   LIMIT 1;

  IF service_role_key IS NULL OR service_role_key = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://wdyhhdaetermrtrgzorw.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object(
      'record', jsonb_build_object(
        'id',       NEW.id,
        'user_id',  NEW.user_id,
        'actor_id', NEW.actor_id,
        'type',     NEW.type::text,
        'post_id',  NEW.post_id
      )
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();
