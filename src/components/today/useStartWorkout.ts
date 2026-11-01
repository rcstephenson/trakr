import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as sessions from '../../db/repositories/sessions';
import { ActiveSessionExistsError, type StartOptions } from '../../db/repositories/sessions';

/** Starts a workout and navigates to it; if one is already active, goes to that instead. */
export function useStartWorkout() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  async function start(programId: string, workoutId: string, options?: StartOptions) {
    if (starting) return;
    setStarting(true);
    try {
      const session = await sessions.start(programId, workoutId, options);
      navigate(`/session/${session.id}`);
    } catch (err) {
      if (err instanceof ActiveSessionExistsError) {
        navigate(`/session/${err.sessionId}`);
      } else {
        setStarting(false);
        throw err;
      }
    }
  }

  return { start, starting };
}
