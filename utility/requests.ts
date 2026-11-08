import { cache } from "react";
import { api_instance } from "@/global";
import {
  VideoDTO,
  UserDTO,
  UsernameCheckResult,
  VideoMetadataUpdateRequest,
  PaginatedVideoResponse,
  VideoCategory,
  VideoVisibility,
  PageResponse,
  SubscriptionStatusDTO,
  WatchProgressDTO,
  PlaylistDTO,
  PlaylistDetailDTO,
  PresignedUploadRequestDTO,
  PresignedUploadResponseDTO,
  CompletePresignedUploadDTO,
  TranscodeProgress,
} from "@/types/video";
import { sanitizeMediaUrls } from "@/utility/s3";

async function parseJson<T = any>(res: Response): Promise<T> {
  const json = await res.json();
  return sanitizeMediaUrls(json);
}

export * from "@/types/video";

export interface LoginPayload {
  email?: string;
  identifier?: string;
  password: string;
}

export interface LoginResponse {
  idToken?: string;
  refreshToken?: string;
  uid?: string;
}

export interface GoogleLoginPayload {
  idToken: string;
  username?: string;
  fullName?: string;
}

export interface GoogleLoginResponse {
  idToken?: string;
  refreshToken?: string;
  uid?: string;
  isNewUser?: boolean;
  primaryProvider?: string;
  providers?: string[];
  emailVerified?: boolean;
  user?: {
    userId: string;
    username?: string;
    fullName?: string;
    user_email?: string;
    avatar_url?: string;
    user_role?: string;
    user_name?: string;
  };
}

export interface createUserPayload {
  email: string;
  password: string;
  username?: string;
  fullName?: string;
  user_name?: string;
  avatar_url: string;
}

export interface VideoPageProps {
  id: string;
}

export interface VideoUploader {
  userId: string;
  user_name: string;
  user_email: string;
  avatar_url: string | null;
}

// Kept for backward-compatibility with existing components
export type VideoResponse = VideoDTO;

export interface User {
  userId: string;
  user_email: string;
  user_name: string;
  avatar_url: string;
  username?: string;
  fullName?: string;
  full_name?: string;
  user_role?: string;
}

export interface UploadVideo {
  videoTitle: string;
  file: File;
  userId: string;
}

export const checkUsernameAvailability = async (
  username: string
): Promise<UsernameCheckResult> => {
  const res = await fetch(
    `${api_instance}/app/check-username?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Username check failed with status ${res.status}: ${text}`);
  }
  return parseJson(res);
};

export const searchUsers = async (
  query: string,
  limit = 10
): Promise<UserDTO[]> => {
  try {
    const res = await fetch(
      `${api_instance}/user/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) return [];
    return parseJson(res);
  } catch {
    return [];
  }
};

export const verifyToken = async (idToken: string): Promise<{ id: string }> => {
  const res = await fetch(`${api_instance}/app/verifyToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: idToken,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token verification failed: ${error}`);
  }

  return parseJson(res); // { id: 'uid123' }
};

export const loginUser = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  const ident = payload.identifier || payload.email || "";
  const formData = new FormData();
  formData.append("email", ident);
  formData.append("username", ident);
  formData.append("identifier", ident);
  formData.append("user_name", ident);
  formData.append("password", payload.password);

  const res = await fetch(`${api_instance}/app/login`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed with status ${res.status}: ${text}`);
  }

  const result: LoginResponse = await res.json();
  const uid = await verifyToken(result.idToken || "");

  await fetch("/ui/auth/setSession", {
    method: "POST",
    body: JSON.stringify({
      token: result.idToken,
      uid: uid.id,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return {
    idToken: result.idToken,
    refreshToken: result.refreshToken,
    uid: uid.id,
  };
};

export const googleLogin = async (
  payload: GoogleLoginPayload
): Promise<GoogleLoginResponse> => {
  const res = await fetch(`${api_instance}/app/google-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google login failed with status ${res.status}: ${errorText}`);
  }

  const result: GoogleLoginResponse = await res.json();
  const token = result.idToken || "";
  const uid = result.user?.userId || "";

  if (token && uid) {
    await fetch("/ui/auth/setSession", {
      method: "POST",
      body: JSON.stringify({
        token,
        uid,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return {
    ...result,
    uid,
  };
};

export const createUser = async (
  payload: createUserPayload
): Promise<string> => {
  const handle = payload.username || payload.user_name || "";
  const fullName = payload.fullName || payload.user_name || handle;

  const formData = new FormData();
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("avatar_url", payload.avatar_url);
  formData.append("username", handle);
  formData.append("user_name", handle);
  formData.append("fullName", fullName);

  const res = await fetch(`${api_instance}/app/createUser`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`User creation failed: ${res.status} - ${text}`);
  }

  return res.statusText;
};

export const getVideoData = async (
  payload: VideoPageProps
): Promise<VideoResponse> => {
  const res = await fetch(`${api_instance}/vid/view/${payload.id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to Load Video: ${res.status} - ${text}`);
  }

  return parseJson(res);
};

export const getUser = async (uid: string, token: string): Promise<User> => {
  const res = await fetch(`${api_instance}/user/getUser/${uid}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get user failed: ${res.status} - ${text}`);
  }

  return parseJson(res);
};

export const updateUser = async (data: User, token: string): Promise<void> => {
  const formData = new FormData();
  formData.append("user_email", data.user_email);
  formData.append("avatar_url", data.avatar_url);
  formData.append("user_name", data.user_name);
  formData.append("userId", data.userId);
  if (data.fullName) formData.append("fullName", data.fullName);
  if (data.username) formData.append("username", data.username);

  const res = await fetch(`${api_instance}/user/update`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Update user failed: ${res.status}`);
  }
};

// TODO : not needed , due to axios call in page itself, depricate it or modularise actual call
export const uploadVideo = async (
  values: UploadVideo,
  token: string
): Promise<void> => {
  const formData = new FormData();
  formData.append("videoTitle", values.videoTitle);
  formData.append("file", values.file);
  formData.append("userId", values.userId);

  const res = await fetch(`${api_instance}/vid/upload`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Video upload failed: ${res.status} - ${text}`);
  }
};

export const sendResetPasswordEmail = async (email: string): Promise<void> => {
  const formData = new FormData();
  formData.append("email", email);

  const res = await fetch(`${api_instance}/app/reset`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`User Password could not be reset : ${text}`);
  }
};

export const fetchVideos = async (page: number) => {
  const res = await fetch(`${api_instance}/vid/all?page=${page}&size=12`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch videos failed: ${res.status}`);
  }

  return parseJson(res);
};

export async function fetchUserVideos(
  page: number,
  userId: string,
  token: string
) {
  const res = await fetch(
    `${api_instance}/vid/user/${userId}?page=${page}&size=10`,
    {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch user videos");
  return parseJson(res);
}

export async function deleteVideo(
  userId: string,
  videoId: number,
  token?: string | null
) {
  const headers: Record<string, string> = {};
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${api_instance}/vid/user/${encodeURIComponent(userId)}/${videoId}`,
    {
      method: "POST",
      credentials: "include",
      headers,
    }
  );
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || "Failed to delete video");
  }
  return res.text();
}

export const getVideoBySlug = cache(async (slug: string): Promise<VideoDTO> => {
  const res = await fetch(`${api_instance}/vid/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load video by slug: ${res.status} - ${text}`);
  }
  return parseJson(res);
});

export const getVideoById = cache(async (id: string | number): Promise<VideoDTO> => {
  const res = await fetch(`${api_instance}/vid/view/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load video: ${res.status} - ${text}`);
  }
  return parseJson(res);
});

export const updateVideoMetadata = async (
  videoId: number,
  userId: string,
  payload: VideoMetadataUpdateRequest,
  token: string
): Promise<VideoDTO> => {
  const res = await fetch(
    `${api_instance}/vid/${videoId}?userId=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update video metadata: ${res.status} - ${text}`);
  }

  return parseJson(res);
};

export interface SearchVideosParams {
  query?: string;
  categories?: VideoCategory[];
  category?: string;
  tags?: string[];
  tag?: string;
  page?: number;
  size?: number;
}

export const searchVideos = async (
  paramsOrQuery?: SearchVideosParams | string,
  category?: string,
  tag?: string,
  page = 0,
  size = 12
): Promise<PageResponse<VideoDTO>> => {
  let queryVal: string | undefined;
  let categoriesList: string[] = [];
  let tagsList: string[] = [];
  let pageVal = 0;
  let sizeVal = 12;

  if (typeof paramsOrQuery === "object" && paramsOrQuery !== null) {
    queryVal = paramsOrQuery.query;
    if (paramsOrQuery.categories && paramsOrQuery.categories.length > 0) {
      categoriesList = paramsOrQuery.categories.filter(
        (c) => (c as string) !== "ALL"
      );
    } else if (paramsOrQuery.category && paramsOrQuery.category !== "ALL") {
      categoriesList = [paramsOrQuery.category];
    }

    if (paramsOrQuery.tags && paramsOrQuery.tags.length > 0) {
      tagsList = paramsOrQuery.tags
        .filter((t) => t && t.trim())
        .map((t) => t.trim().replace(/^#/, ""));
    } else if (paramsOrQuery.tag && paramsOrQuery.tag.trim()) {
      tagsList = [paramsOrQuery.tag.trim().replace(/^#/, "")];
    }

    pageVal = paramsOrQuery.page ?? 0;
    sizeVal = paramsOrQuery.size ?? 12;
  } else {
    queryVal = paramsOrQuery;
    if (category && category !== "ALL") {
      categoriesList = [category];
    }
    if (tag && tag.trim()) {
      tagsList = [tag.trim().replace(/^#/, "")];
    }
    pageVal = page;
    sizeVal = size;
  }

  const params = new URLSearchParams();
  if (queryVal && queryVal.trim()) {
    params.append("query", queryVal.trim());
  }
  if (categoriesList.length > 0) {
    params.append("category", categoriesList.join(","));
  }
  if (tagsList.length > 0) {
    params.append("tag", tagsList.join(","));
  }
  params.append("page", pageVal.toString());
  params.append("size", sizeVal.toString());

  const res = await fetch(`${api_instance}/vid/search?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Search videos failed: ${res.status}`);
  }

  return parseJson(res);
};

export const getPublicUser = async (
  userId: string
): Promise<UserDTO | null> => {
  try {
    const res = await fetch(
      `${api_instance}/user/getUser/${encodeURIComponent(userId)}`,
      {
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return parseJson(res);
  } catch {
    return null;
  }
};

export const getPublicUserVideos = async (
  userId: string,
  page = 0,
  size = 24
): Promise<PaginatedVideoResponse | null> => {
  try {
    const res = await fetch(
      `${api_instance}/vid/user/${encodeURIComponent(userId)}?page=${page}&size=${size}`,
      {
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return parseJson(res);
  } catch {
    return null;
  }
};


export interface ServiceHealth {
  status: "UP" | "DOWN" | "DEGRADED";
  latencyMs: number;
  details?: string;
}

export interface SystemHealthResponse {
  status: "UP" | "DOWN" | "DEGRADED";
  timestamp: number;
  services: {
    postgres?: ServiceHealth;
    redis?: ServiceHealth;
    rabbitmq?: ServiceHealth;
    firebase?: ServiceHealth;
    s3?: ServiceHealth;
    [key: string]: ServiceHealth | undefined;
  };
}

export const fetchSystemHealth = async (): Promise<SystemHealthResponse> => {
  const res = await fetch(`${api_instance}/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Health check returned HTTP ${res.status}`);
  }
  return parseJson(res);
};

export const recordVideoView = async (
  videoId: string | number
): Promise<boolean> => {
  try {
    const res = await fetch(`${api_instance}/vid/${videoId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
};

// ==========================================
// Phase 2 & 3: Discovery, Related & Trending
// ==========================================

export const fetchRelatedVideos = async (
  videoId: number | string,
  page = 0,
  size = 10
): Promise<PageResponse<VideoDTO>> => {
  const res = await fetch(
    `${api_instance}/vid/${videoId}/related?page=${page}&size=${size}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch related videos: ${res.status}`);
  }
  return parseJson(res);
};

export const fetchTrendingVideos = async (
  page = 0,
  size = 20
): Promise<PageResponse<VideoDTO>> => {
  const res = await fetch(
    `${api_instance}/vid/trending?page=${page}&size=${size}`,
    {
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch trending videos: ${res.status}`);
  }
  return parseJson(res);
};

export const fetchSearchSuggestions = async (
  query: string,
  limit = 8
): Promise<string[]> => {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(
      `${api_instance}/vid/search/suggest?q=${encodeURIComponent(query.trim())}&limit=${limit}`
    );
    if (!res.ok) return [];
    return parseJson(res);
  } catch {
    return [];
  }
};

// ==========================================
// Phase 2: Channel Subscriptions
// ==========================================

export const getSubscriptionStatus = async (
  channelId: string,
  token?: string
): Promise<SubscriptionStatusDTO> => {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(
    `${api_instance}/channel/${encodeURIComponent(channelId)}/status`,
    {
      headers,
      cache: "no-store",
    }
  );
  if (!res.ok) {
    return { channelUserId: channelId, subscriberCount: 0, isSubscribed: false, subscribed: false };
  }
  return parseJson(res);
};

export const toggleSubscribe = async (
  channelId: string,
  token: string
): Promise<SubscriptionStatusDTO> => {
  const res = await fetch(
    `${api_instance}/channel/${encodeURIComponent(channelId)}/subscribe`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Toggle subscribe failed: ${res.status} - ${text}`);
  }
  return parseJson(res);
};

export const getSubscriberCount = async (
  channelId: string
): Promise<{ channelId: string; subscriberCount: number }> => {
  const res = await fetch(
    `${api_instance}/channel/${encodeURIComponent(channelId)}/subscribers`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return { channelId, subscriberCount: 0 };
  }
  return parseJson(res);
};

// ==========================================
// Phase 1: Watch History Feed & Progress Tracking
// ==========================================

export const recordWatchProgress = async (
  videoId: number | string,
  seconds: number,
  duration?: number,
  token?: string,
  keepalive = false
): Promise<WatchProgressDTO | null> => {
  try {
    const params = new URLSearchParams();
    params.append("seconds", String(Math.max(0, Math.floor(seconds))));
    if (duration !== undefined && !isNaN(duration)) {
      params.append("duration", String(Math.max(0, Math.floor(duration))));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
      `${api_instance}/vid/${videoId}/progress?${params.toString()}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          seconds: Math.max(0, Math.floor(seconds)),
          duration: duration !== undefined && !isNaN(duration) ? Math.max(0, Math.floor(duration)) : undefined,
        }),
        keepalive,
      }
    );

    if (!res.ok) return null;
    return parseJson(res);
  } catch {
    return null;
  }
};

export const fetchWatchProgress = async (
  videoId: number | string,
  token?: string
): Promise<WatchProgressDTO | null> => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${api_instance}/vid/${videoId}/progress`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseJson(res);
  } catch {
    return null;
  }
};

export const fetchUserWatchHistory = async (
  page = 0,
  size = 20,
  token: string
): Promise<PageResponse<WatchProgressDTO>> => {
  const res = await fetch(
    `${api_instance}/user/history?page=${page}&size=${size}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch watch history: ${res.status}`);
  }
  return parseJson(res);
};

export const deleteWatchHistoryItem = async (
  videoId: number,
  token: string
): Promise<void> => {
  const res = await fetch(`${api_instance}/user/history/${videoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to remove item from history: ${res.status}`);
  }
};

export const clearAllWatchHistory = async (token: string): Promise<void> => {
  const res = await fetch(`${api_instance}/user/history`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to clear watch history: ${res.status}`);
  }
};

// ==========================================
// Phase 2: Playlists & Watch Later
// ==========================================

export const fetchMyPlaylists = async (token: string): Promise<PlaylistDTO[]> => {
  const res = await fetch(`${api_instance}/playlists/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch playlists: ${res.status}`);
  }
  return parseJson(res);
};

export const fetchPlaylistDetails = async (
  playlistId: number | string,
  token?: string
): Promise<PlaylistDetailDTO> => {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${api_instance}/playlists/${playlistId}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist details: ${res.status}`);
  }
  return parseJson(res);
};

export const createPlaylist = async (
  payload: { title: string; description?: string; visibility?: string },
  token: string
): Promise<PlaylistDTO> => {
  const res = await fetch(`${api_instance}/playlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create playlist: ${res.status}`);
  }
  return parseJson(res);
};

export const addVideoToPlaylist = async (
  playlistId: number,
  videoId: number,
  token: string
): Promise<PlaylistDetailDTO> => {
  const res = await fetch(
    `${api_instance}/playlists/${playlistId}/videos/${videoId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to add video to playlist: ${res.status}`);
  }
  return parseJson(res);
};

export const removeVideoFromPlaylist = async (
  playlistId: number,
  videoId: number,
  token: string
): Promise<PlaylistDetailDTO> => {
  const res = await fetch(
    `${api_instance}/playlists/${playlistId}/videos/${videoId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to remove video from playlist: ${res.status}`);
  }
  return parseJson(res);
};

export const deletePlaylist = async (
  playlistId: number,
  token: string
): Promise<void> => {
  const res = await fetch(`${api_instance}/playlists/${playlistId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to delete playlist: ${res.status}`);
  }
};

export const toggleWatchLater = async (
  videoId: number,
  token: string
): Promise<PlaylistDetailDTO> => {
  const res = await fetch(
    `${api_instance}/playlists/watch-later/${videoId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to toggle watch later: ${res.status}`);
  }
  return parseJson(res);
};

// ==========================================
// Phase 4: Direct S3 Presigned Upload
// ==========================================

export const requestPresignedUpload = async (
  fileName: string,
  contentType: string,
  token: string
): Promise<PresignedUploadResponseDTO> => {
  const res = await fetch(`${api_instance}/vid/upload/presigned`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileName, contentType }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Presigned upload request failed: ${res.status} - ${text}`);
  }
  return parseJson(res);
};

export const completePresignedUpload = async (
  payload: CompletePresignedUploadDTO,
  token: string
): Promise<{ videoId: number; message: string; processId?: string }> => {
  const res = await fetch(`${api_instance}/vid/upload/complete-presigned`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Complete presigned upload failed: ${res.status} - ${text}`);
  }
  return parseJson(res);
};

export const abortPresignedUpload = async (
  processId: string,
  token?: string
): Promise<void> => {
  if (!processId) return;
  try {
    await fetch(
      `${api_instance}/vid/upload/process/${encodeURIComponent(processId)}/abort`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  } catch (err) {
    console.warn("Failed to abort presigned upload process:", err);
  }
};
