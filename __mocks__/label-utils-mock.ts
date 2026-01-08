// Mock for LabelUtils
export const calculateFinalLabel = (labelName: string, score: number) => {
  return {
    label: labelName,
    percentage: Math.abs(score) * 100
  };
};