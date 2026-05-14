import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { StoryState, StoryStateUpdate, DEFAULT_STORY_STATE } from './types';

const STORY_COLLECTION = 'ships';
const STORY_DOC = 'current';

function storyStateRef(userId: string) {
  return doc(db, STORY_COLLECTION, userId, 'storyState', STORY_DOC);
}

/**
 * Read the current story state from Firestore.
 * Returns the default (CP-01) if no document exists.
 */
export async function getStoryState(userId: string): Promise<StoryState> {
  try {
    const snap = await getDoc(storyStateRef(userId));
    if (snap.exists()) {
      return snap.data() as StoryState;
    }
  } catch (err) {
    console.error('[storyState] Failed to read:', err);
  }
  return { ...DEFAULT_STORY_STATE };
}

/**
 * Initialize (or reset) a story state document for a new user.
 */
export async function initStoryState(userId: string): Promise<void> {
  await setDoc(storyStateRef(userId), {
    ...DEFAULT_STORY_STATE,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Apply a partial update from the AI's story_state_update directive.
 * Reads current doc, applies changes, writes back.
 */
export async function applyStoryStateUpdate(
  userId: string,
  update: StoryStateUpdate
): Promise<void> {
  const ref = storyStateRef(userId);
  const data: Record<string, any> = {
    turnCount: (await getDoc(ref)).data()?.turnCount ?? 0,
  };

  // Read current to get base turn count
  const snap = await getDoc(ref);
  const current: StoryState = snap.exists()
    ? (snap.data() as StoryState)
    : { ...DEFAULT_STORY_STATE };

  const next: StoryState = {
    ...current,
    turnCount: current.turnCount + 1,
    updatedAt: Date.now(),
  };

  if (update.advance_checkpoint) {
    // Move active checkpoint to completed, set new one
    if (current.activeCheckpoint && current.activeCheckpoint !== update.advance_checkpoint) {
      next.completedCheckpoints = [
        ...new Set([...current.completedCheckpoints, current.activeCheckpoint]),
      ];
    }
    next.activeCheckpoint = update.advance_checkpoint;
  }

  if (update.set_flags) {
    next.storyFlags = { ...current.storyFlags, ...update.set_flags };
  }

  if (update.resolve_thread && current.activePlotThreads.includes(update.resolve_thread)) {
    next.activePlotThreads = current.activePlotThreads.filter(
      t => t !== update.resolve_thread
    );
    next.resolvedPlotThreads = [...current.resolvedPlotThreads, update.resolve_thread];
  }

  if (update.add_thread && !current.activePlotThreads.includes(update.add_thread)) {
    next.activePlotThreads = [...current.activePlotThreads, update.add_thread];
  }

  await setDoc(ref, next);
}

/**
 * Subscribe to real-time story state changes.
 * Returns unsubscribe function. Calls callback immediately with current data.
 */
export function listenToStoryState(
  userId: string,
  callback: (state: StoryState) => void
): Unsubscribe {
  return onSnapshot(
    storyStateRef(userId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as StoryState);
      } else {
        // No story state yet — create it
        initStoryState(userId).then(() => {
          callback({ ...DEFAULT_STORY_STATE });
        });
      }
    },
    (err) => {
      console.error('[storyState] Listener error:', err);
    }
  );
}

/**
 * Build the story state context string for AI system prompt injection.
 */
export function buildStoryStateContext(state: StoryState): string {
  const lines: string[] = [];
  lines.push(`Active Checkpoint: ${state.activeCheckpoint}`);

  if (state.completedCheckpoints.length > 0) {
    lines.push(`Completed Checkpoints: ${state.completedCheckpoints.join(', ')}`);
  }

  const flagEntries = Object.entries(state.storyFlags);
  if (flagEntries.length > 0) {
    lines.push(`Story Flags: ${flagEntries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }

  if (state.activePlotThreads.length > 0) {
    lines.push(`Active Plot Threads:`);
    state.activePlotThreads.forEach(t => lines.push(`  - ${t}`));
  }

  if (state.resolvedPlotThreads.length > 0) {
    lines.push(`Resolved Plot Threads:`);
    state.resolvedPlotThreads.forEach(t => lines.push(`  - ${t}`));
  }

  lines.push(`Total Turns: ${state.turnCount}`);

  return lines.join('\n');
}