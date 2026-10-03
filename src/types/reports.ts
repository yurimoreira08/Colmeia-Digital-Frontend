import type { Apiary } from './apiary';
import type { Box } from './box';
import type { ReviewReport } from './reviewReport';
import type { ManejoReport } from './manejo';

export type ReportsFilter = 'apiarios' | 'caixas' | 'revisoes' | 'manejos';

export type ReportsPayload = {
  filter: ReportsFilter;
  dateWindow: {
    from: string;
    to: string;
  };
  data: {
    apiaries: Apiary[];
    boxes: Box[];
    revisions?: ReviewReport[];
    manejos?: ManejoReport[];
  };
};

export type BarData = {
  label: string;
  value: number;
};

export type ReportsMetrics = {
  periodDays: number;
  totalApiaries: number;
  totalBoxes: number;
  apiaryGrowthPercent: number;
  boxGrowthPercent: number;
  topLocations: Array<{ location: string; total: number }>;
  barsData: BarData[];
};
