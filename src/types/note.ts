export type Note = {
  id: number;
  description: string;
  status: number; // 0: Pendente, 1: Realizado
  createdAt: string;
  archived: boolean;
};
