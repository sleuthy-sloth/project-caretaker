import { useState, useEffect, useCallback } from 'react';
import { StoryState, StoryStateUpdate, DEFAULT_STORY_STATE } from '../lib/types';
import {
  listenToStoryState,
  buildStoryStateContext,
  applyStoryStateUpdate as firestoreApplyUpdate,
} from '../lib/storyState';

export function useStoryState(userId: string | null) {
  const initialContext = buildStoryStateContext(DEFAULT_STORY_STATE);
  const [storyState, setStoryState] = useState<StoryState>({ ...DEFAULT_STORY_STATE });
  const [contextString, setContextString] = useState<string>(initialContext);

  useEffect(() => {
    if (!userId) {
      setStoryState({ ...DEFAULT_STORY_STATE });
      setContextString(initialContext);
      return;
    }

    const unsub = listenToStoryState(userId, (state) => {
      setStoryState(state);
      setContextString(buildStoryStateContext(state));
    });

    return () => unsub();
  }, [userId]);

  const applyUpdate = useCallback(async (update: StoryStateUpdate | undefined) => {
    if (!userId || !update) return;
    try {
      await firestoreApplyUpdate(userId, update);
    } catch (err) {
      console.error('[storyState] Failed to apply update:', err);
    }
  }, [userId]);

  return { storyState, storyStateContext: contextString, applyUpdate };
}