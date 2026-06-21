export type PublishStatus = "draft" | "review" | "approved" | "archived";
export type ContentType = "video" | "audio" | "pdf" | "image_gallery" | "quiz" | "learning_module" | "game";

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string; // e.g. "natur", "wissen", "kreativ"
  subCategory?: string; // e.g. "tiere", "pflanzen", "ozeane", "technik", "geschichte", "malen"
  tags: string[];
  contentType: ContentType;
  language: string;
  ageRating: number; // age_min
  thumbnail: string;
  filePath: string;
  duration: number; // in seconds
  version: number;
  publishStatus: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  allowed_categories: string[];
}

export interface SyncManifest {
  version: number;
  contents: ContentItem[];
}

export interface DownloadState {
  itemId: string;
  progress: number; // 0 to 100
  status: "idle" | "downloading" | "downloaded" | "failed";
}
