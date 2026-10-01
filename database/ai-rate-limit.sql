CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.ai_request_windows (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL, requests integer NOT NULL CHECK(requests BETWEEN 1 AND 20)
);
ALTER TABLE private.ai_request_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.ai_request_windows FROM PUBLIC, anon, authenticated;
CREATE FUNCTION private.consume_ai_request() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); used integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO private.ai_request_windows(user_id,window_start,requests)
 VALUES(uid,now(),1)
 ON CONFLICT(user_id) DO UPDATE
 SET window_start=CASE WHEN private.ai_request_windows.window_start <= now()-interval '1 hour' THEN now() ELSE private.ai_request_windows.window_start END,
 requests=CASE WHEN private.ai_request_windows.window_start <= now()-interval '1 hour' THEN 1 ELSE private.ai_request_windows.requests+1 END
 WHERE private.ai_request_windows.window_start <= now()-interval '1 hour' OR private.ai_request_windows.requests < 20
 RETURNING requests INTO used;
 RETURN used IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.consume_ai_request() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.consume_ai_request() TO authenticated;
CREATE FUNCTION public.consume_ai_request() RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.consume_ai_request(); $$;
REVOKE ALL ON FUNCTION public.consume_ai_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_request() TO authenticated;
