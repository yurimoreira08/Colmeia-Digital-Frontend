export type Apiary = {
  id: number;
  name: string;
  location: string;
  boxCount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  role?: 'owner' | 'editor' | 'reader';
  user_id?: number;
};

