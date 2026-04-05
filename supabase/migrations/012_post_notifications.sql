-- Create notifications automatically when other users comment on or react to posts.

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
BEGIN
  SELECT author_id
  INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;

  IF post_author_id IS NULL OR post_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id, comment_id)
  VALUES (post_author_id, NEW.author_id, 'COMMENT', NEW.post_id, NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_reaction_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
BEGIN
  SELECT author_id
  INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;

  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.reaction_type IS NOT DISTINCT FROM NEW.reaction_type THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = post_author_id
    AND actor_id = NEW.user_id
    AND post_id = NEW.post_id
    AND type = 'REACTION'
    AND comment_id IS NULL;

  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (post_author_id, NEW.user_id, 'REACTION', NEW.post_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_create_notification ON public.comments;
CREATE TRIGGER comments_create_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();

DROP TRIGGER IF EXISTS post_reactions_create_notification ON public.post_reactions;
CREATE TRIGGER post_reactions_create_notification
AFTER INSERT OR UPDATE OF reaction_type ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.create_reaction_notification();
