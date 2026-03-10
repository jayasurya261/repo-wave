/**
 * user-store.ts
 * Shared singleton for user session + bookmark/favourite state.
 * All card scripts import this — so auth + API calls happen ONCE
 * per page (in parallel) rather than once per card rendered.
 */
import { authClient } from './auth-client';

type UserState = {
    userId: string | null;
    repoBookmarks: Set<string>;
    issueBookmarks: Set<string>;
    repoFavourites: Set<string>;
    issueFavourites: Set<string>;
    ready: boolean;
    loggedIn: boolean;
};

const state: UserState = {
    userId: null,
    repoBookmarks: new Set(),
    issueBookmarks: new Set(),
    repoFavourites: new Set(),
    issueFavourites: new Set(),
    ready: false,
    loggedIn: false,
};

let _initPromise: Promise<UserState> | null = null;

async function safeFetch(url: string) {
    try {
        const res = await fetch(url);
        return res.ok ? res.json() : {};
    } catch {
        return {};
    }
}

export async function getUserState(): Promise<UserState> {
    if (state.ready) return state;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        try {
            const { data: sessionData } = await authClient.getSession();
            if (!sessionData?.user) {
                state.ready = true;
                return state;
            }

            state.userId = sessionData.user.id;
            state.loggedIn = true;

            // All four fetches in parallel — replaces 4×N individual calls
            const [rb, ib, rf, ifav] = await Promise.all([
                safeFetch('/api/bookmarks?type=repo'),
                safeFetch('/api/bookmarks?type=issue'),
                safeFetch('/api/favourites?type=repo'),
                safeFetch('/api/favourites?type=issue'),
            ]);

            state.repoBookmarks = new Set(rb.bookmarks ?? []);
            state.issueBookmarks = new Set(ib.bookmarks ?? []);
            state.repoFavourites = new Set(rf.favourites ?? []);
            state.issueFavourites = new Set(ifav.favourites ?? []);
        } catch (e) {
            console.error('[user-store] init error:', e);
        } finally {
            state.ready = true;
        }
        return state;
    })();

    return _initPromise;
}

/** Call on astro:page-load to reset between navigations */
export function resetUserState() {
    Object.assign(state, {
        userId: null,
        repoBookmarks: new Set(),
        issueBookmarks: new Set(),
        repoFavourites: new Set(),
        issueFavourites: new Set(),
        ready: false,
        loggedIn: false,
    });
    _initPromise = null;
}
