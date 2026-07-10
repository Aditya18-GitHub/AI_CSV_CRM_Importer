import type { AIProvider, SchemaInferenceResult, SemanticInferenceRequest, SemanticInferenceResult } from './AIProvider';
import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { CerebrasProvider } from './CerebrasProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { providerHealth } from '../ProviderHealth';
import { logger } from '@/lib/logger';

class AIProviderManager {
  private providers: AIProvider[] = [];
  private currentIndex = 0;
  private rotationEnabled = true;

  constructor() {
    this.providers = [
      new GeminiProvider(),
      new GroqProvider(),
      new CerebrasProvider(),
      new OpenRouterProvider(),
    ];
    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  private async getNextAvailableProvider(): Promise<AIProvider | null> {
    const availableProviders = await Promise.all(
      this.providers.map(async (provider) => ({
        provider,
        available: await provider.isAvailable(),
      }))
    );

    const healthy = availableProviders.filter((p) => p.available && providerHealth.isHealthy(p.provider.name));
    
    if (healthy.length === 0) {
      // If no healthy providers, try cooling down ones
      const cooling = availableProviders.filter((p) => p.available);
      if (cooling.length === 0) {
        return null;
      }
      return cooling[0].provider;
    }

    // Round-robin among healthy providers
    if (this.rotationEnabled) {
      const index = this.currentIndex % healthy.length;
      this.currentIndex++;
      return healthy[index].provider;
    }

    return healthy[0].provider;
  }

  private async executeWithFailover<T>(
    operation: (provider: AIProvider) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = this.providers.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = await this.getNextAvailableProvider();
      
      if (!provider) {
        throw new Error('No AI providers available. All providers may be in cooldown or misconfigured.');
      }

      logger.info(`Using provider: ${provider.name} for ${operationName}`, {
        attempt: attempt + 1,
        maxRetries,
      });

      try {
        const result = await operation(provider);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const isQuotaError = 
          lastError.message.includes('429') ||
          lastError.message.toLowerCase().includes('quota') ||
          lastError.message.toLowerCase().includes('rate limit');
        
        const isServerError = 
          lastError.message.includes('500') ||
          lastError.message.includes('502') ||
          lastError.message.includes('503') ||
          lastError.message.includes('504');
        
        const isTimeout = 
          lastError.message.toLowerCase().includes('timeout') ||
          lastError.message.toLowerCase().includes('timed out');

        if (isQuotaError || isServerError || isTimeout) {
          logger.warn(`Provider ${provider.name} failed, switching to next provider`, {
            error: lastError.message,
            reason: isQuotaError ? 'quota' : isServerError ? 'server_error' : 'timeout',
          });
          provider.markError(lastError.message);
          continue;
        }

        // For other errors, don't retry with different provider
        throw lastError;
      }
    }

    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  async inferSchema(
    headers: string[],
    sampleRows: Record<string, string>[]
  ): Promise<SchemaInferenceResult> {
    return this.executeWithFailover(
      (provider) => provider.inferSchema(headers, sampleRows),
      'schema inference'
    );
  }

  async inferSemanticValues(
    requests: SemanticInferenceRequest[]
  ): Promise<SemanticInferenceResult[]> {
    return this.executeWithFailover(
      (provider) => provider.inferSemanticValues(requests),
      'semantic inference'
    );
  }

  async inferSemanticMapping(
    unmappedHeaders: string[],
    sampleRows: Record<string, string>[],
    existingMappings: Record<string, string | null | undefined>
  ): Promise<{ semanticMappings: import('./AIProvider').SemanticMappingResult[]; confidence: number }> {
    return this.executeWithFailover(
      (provider) => provider.inferSemanticMapping(unmappedHeaders, sampleRows, existingMappings),
      'semantic mapping'
    );
  }

  setRotationEnabled(enabled: boolean): void {
    this.rotationEnabled = enabled;
  }

  getProviderStatuses() {
    return this.providers.map((provider) => ({
      name: provider.name,
      priority: provider.priority,
      health: provider.getHealth(),
    }));
  }

  resetProviderHealth(providerName: string): void {
    providerHealth.reset(providerName);
  }

  resetAllProviders(): void {
    providerHealth.resetAll();
  }
}

export const aiProviderManager = new AIProviderManager();
