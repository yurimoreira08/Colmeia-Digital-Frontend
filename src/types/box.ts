export type Box = {
  id: number;
  apiaryId: number;
  apiaryName: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  role?: 'reader' | 'editor' | 'owner';
};
