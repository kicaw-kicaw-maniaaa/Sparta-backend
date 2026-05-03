export class RiskGridResponseDto {
  id: number;
  latitude: number;
  longitude: number;
  region: string;
  currentRisk: {
    score: number;
    category: string;
  };
  lastUpdate: Date;
}

export class GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'Polygon';
    coordinates: number[] | number[][];
  };
  properties: {
    gridId: number;
    score: number;
    category: string;
    region?: string;
    [key: string]: any;
  };
}

export class RiskGridGeoJsonDto {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}
