
import { WorkspaceState } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'ethereal_workspace_v2_final';
const FIREBASE_URL = 'https://als-update-log-copy-default-rtdb.firebaseio.com/workspace.json';

export const storageService = {
  saveLocal: (state: WorkspaceState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Local storage save failed", e);
    }
  },

  saveRemote: async (state: WorkspaceState) => {
    try {
      const response = await fetch(FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error('Remote sync failed');
      return true;
    } catch (e) {
      console.error("Firebase Sync Error:", e);
      return false;
    }
  },

  load: async (): Promise<WorkspaceState> => {
    // Try remote first
    try {
      const response = await fetch(FIREBASE_URL);
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && remoteData.items && remoteData.tabs) {
          console.log("Global Archive Uplink Successful");
          return remoteData;
        }
      }
    } catch (e) {
      console.warn("Remote uplink unavailable, falling back to local cache.");
    }

    // Fallback to local
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return INITIAL_DATA;
    try {
      const parsed = JSON.parse(data);
      if (!parsed.items || !parsed.tabs) return INITIAL_DATA;
      return parsed;
    } catch (e) {
      return INITIAL_DATA;
    }
  }
};
