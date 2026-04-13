-- Create notifications when someone RSVPs to a meetup post.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type_enum' AND e.enumlabel = 'MEETUP_RSVP'
  ) THEN
    ALTER TYPE notification_type_enum ADD VALUE 'MEETUP_RSVP';
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.create_meetup_rsvp_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meetup_host_id UUID;
BEGIN
  SELECT author_id
  INTO meetup_host_id
  FROM public.posts
  WHERE id = NEW.meetup_post_id;

  IF meetup_host_id IS NULL OR meetup_host_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = meetup_host_id
    AND actor_id = NEW.user_id
    AND post_id = NEW.meetup_post_id
    AND type = 'MEETUP_RSVP'
    AND comment_id IS NULL;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (meetup_host_id, NEW.user_id, 'MEETUP_RSVP', NEW.meetup_post_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meetup_rsvps_create_notification ON public.meetup_rsvps;
CREATE TRIGGER meetup_rsvps_create_notification
AFTER INSERT ON public.meetup_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.create_meetup_rsvp_notification();
