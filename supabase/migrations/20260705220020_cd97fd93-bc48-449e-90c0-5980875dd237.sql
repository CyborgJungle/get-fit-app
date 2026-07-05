
DROP POLICY "own exercises" ON public.exercises;
CREATE POLICY "own exercises" ON public.exercises FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own sessions" ON public.workout_sessions;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own set logs" ON public.set_logs;
CREATE POLICY "own set logs" ON public.set_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
