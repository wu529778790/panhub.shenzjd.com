export interface FavoriteItem {
  url: string;
  title: string;
  platform: string;
  password?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface FavoriteVaultPayload {
  version: 1;
  items: FavoriteItem[];
}
