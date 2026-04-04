const PROFILE_CACHE_UPDATED_EVENT = "profile-cache-updated"

type CachedProfile = {
  displayName?: string
  avatarUrl?: string
}

function getProfileCacheKey(email: string) {
  return `baitari.profile.${email.toLowerCase()}`
}

export function readCachedProfile(email: string | null | undefined): CachedProfile | null {
  if (!email || typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getProfileCacheKey(email))
    return raw ? (JSON.parse(raw) as CachedProfile) : null
  } catch (error) {
    console.error("[ProfileCache] Failed to read cached profile", error)
    return null
  }
}

export function writeCachedProfile(email: string | null | undefined, profile: CachedProfile) {
  if (!email || typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(getProfileCacheKey(email), JSON.stringify(profile))
    window.dispatchEvent(
      new CustomEvent(PROFILE_CACHE_UPDATED_EVENT, {
        detail: { email, profile },
      })
    )
  } catch (error) {
    console.error("[ProfileCache] Failed to write cached profile", error)
  }
}

export function subscribeToCachedProfile(
  callback: (event: CustomEvent<{ email: string; profile: CachedProfile }>) => void
) {
  const handler = (event: Event) => callback(event as CustomEvent<{ email: string; profile: CachedProfile }>)
  window.addEventListener(PROFILE_CACHE_UPDATED_EVENT, handler)
  return () => window.removeEventListener(PROFILE_CACHE_UPDATED_EVENT, handler)
}
