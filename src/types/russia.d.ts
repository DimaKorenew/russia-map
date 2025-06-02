declare module '*.json' {
  const value: {
    type: string;
    features: Array<{
      type: string;
      properties: {
        name: string;
        population: number;
        area: number;
        capital: string;
      };
      geometry: {
        type: string;
        coordinates: number[][][];
      };
    }>;
  };
  export default value;
} 