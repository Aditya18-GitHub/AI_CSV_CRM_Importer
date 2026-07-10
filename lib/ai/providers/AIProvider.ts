import type { ColumnMapping } from '@/types/crm';

export interface SemanticMappingResult {
  header: string;
  field: string | null;
  confidence: number;
  reason: string;
}

export interface SchemaInferenceResult {
  fieldMappings: ColumnMapping['fieldMappings'];
  noteColumns: string[];
  multiValueColumns: string[];
  confidence: number;
  semanticMappings?: SemanticMappingResult[];
}

export interface SemanticInferenceRequest {
  field: string;
  values: string[];
  context?: string;
}

export interface SemanticInferenceResult {
  field: string;
  mappings: Record<string, string>;
  confidence: number;
}

export interface ProviderHealthStatus {
  status: 'healthy' | 'cooling_down' | 'unavailable' | 'disabled';
  lastError?: string;
  lastErrorTime?: number;
  cooldownUntil?: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  lastUsed?: number;
}

export interface AIProviderConfig {
  name: string;
  priority: number;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface AIProvider {
  readonly name: string;
  readonly priority: number;
  
  isAvailable(): Promise<boolean>;
  getHealth(): ProviderHealthStatus;
  markError(error: string): void;
  markSuccess(): void;
  
  inferSchema(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<SchemaInferenceResult>;
  
  inferSemanticValues(
    requests: SemanticInferenceRequest[]
  ): Promise<SemanticInferenceResult[]>;
  
  inferSemanticMapping(
    unmappedHeaders: string[],
    sampleRows: Record<string, string>[],
    existingMappings: Record<string, string | null | undefined>
  ): Promise<{ semanticMappings: SemanticMappingResult[]; confidence: number }>;
}
