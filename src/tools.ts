export type Tool = 'auto' | 'till' | 'water' | 'plant' | 'fertilize' | 'harvest';

export const TOOL_INFO: Record<Tool, { icon: string; name: string }> = {
  auto: { icon: '✋', name: 'Otomatis' },
  till: { icon: '⛏️', name: 'Cangkul' },
  water: { icon: '🚿', name: 'Siram' },
  plant: { icon: '🌱', name: 'Tanam' },
  fertilize: { icon: '🧪', name: 'Pupuk' },
  harvest: { icon: '🌾', name: 'Sabit' },
};

export const tools = { current: 'auto' as Tool, seed: null as string | null };
