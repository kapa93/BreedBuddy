-- Create notifications when someone records that their dog met another dog.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type_enum' AND e.enumlabel = 'DOG_INTERACTION'
  ) THEN
    ALTER TYPE notification_type_enum ADD VALUE 'DOG_INTERACTION';
  END IF;
END$$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dog_interaction_id UUID REFERENCES public.dog_interactions(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.create_dog_interaction_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_1 UUID;
  owner_2 UUID;
BEGIN
  SELECT owner_id INTO owner_1 FROM public.dogs WHERE id = NEW.dog_id_1;
  SELECT owner_id INTO owner_2 FROM public.dogs WHERE id = NEW.dog_id_2;

  IF owner_1 IS NOT NULL AND owner_1 <> NEW.created_by_user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, dog_interaction_id)
    VALUES (owner_1, NEW.created_by_user_id, 'DOG_INTERACTION', NEW.id);
  END IF;

  IF owner_2 IS NOT NULL AND owner_2 <> NEW.created_by_user_id AND owner_2 <> owner_1 THEN
    INSERT INTO public.notifications (user_id, actor_id, type, dog_interaction_id)
    VALUES (owner_2, NEW.created_by_user_id, 'DOG_INTERACTION', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dog_interactions_create_notification ON public.dog_interactions;
CREATE TRIGGER dog_interactions_create_notification
AFTER INSERT ON public.dog_interactions
FOR EACH ROW
EXECUTE FUNCTION public.create_dog_interaction_notification();
