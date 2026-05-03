/**
 * Routing Validation Test — checks if every model configured in .env is reachable.
 * Run: npx tsx test/routing-validation.ts
 */
// Env loaded via node --env-file=.env
// No import needed — Node 21+ loads .env natively

import { ALL_MODELS, API_KEY_MAPPINGS, Model, ModelProvider, ModelCategory } from '../lib/models';
import { modelManager } from '../lib/model-manager';
import { aiRouter, IntelligentAIRouter } from '../lib/ai-router';
import { aiClient } from '../lib/ai-client';

// ─── 1. PROVIDER → API KEY DETECTION ─────────────────────────────────────
type ProviderReport = {
  provider: string;
  envVar: string;
  hasValidKey: boolean;
  keyPreview: string;
  reason?: string;
};

function scanProviders(): ProviderReport[] {
  const reports: ProviderReport[] = [];

  for (const [provider, envVar] of Object.entries(API_KEY_MAPPINGS)) {
    const singleKey = process.env[envVar];
    const keys: string[] = [];

    if (singleKey && singleKey.length > 0) keys.push(singleKey);

    let idx = 1;
    while (true) {
      const nk = process.env[`${envVar}_${idx}`];
      if (!nk || nk.length === 0) break;
      keys.push(nk);
      idx++;
    }

    const validKeys = keys.filter(
      k => !k.includes('your_') && !k.includes('_here') && k.length > 10
    );
    const invalidKeys = keys.filter(
      k => k.includes('your_') || k.includes('_here') || k.length <= 10
    );

    let reason: string | undefined;
    if (keys.length > 0 && validKeys.length === 0) {
      reason = invalidKeys.map(k => `placeholder: "${k.slice(0, 40)}"`).join(', ');
    }

    reports.push({
      provider,
      envVar,
      hasValidKey: validKeys.length > 0,
      keyPreview: validKeys.length > 0
        ? `${validKeys[0].slice(0, 8)}...${validKeys[0].slice(-4)} (${validKeys.length} key(s))`
        : (keys.length > 0 ? 'PLACEHOLDER' : 'MISSING'),
      reason,
    });
  }

  return reports;
}

// ─── 2. MODEL → AVAILABILITY CHECK ───────────────────────────────────────
type ModelReport = {
  model: Model;
  available: boolean;
  providerHasKey: boolean;
  isFree: boolean;
  errors: string[];
};

function scanModels(providerReports: ProviderReport[]): ModelReport[] {
  const reports: ModelReport[] = [];
  const providerMap = new Map(providerReports.map(p => [p.provider, p.hasValidKey]));

  for (const model of ALL_MODELS) {
    const validation = modelManager.validateModel(model);
    const hasKey = providerMap.get(model.provider) ?? false;
    reports.push({
      model,
      available: validation.isValid,
      providerHasKey: hasKey,
      isFree: model.costPer1kTokens === 0,
      errors: validation.errors,
    });
  }

  return reports;
}

// ─── 3. ROUTING TEST ─────────────────────────────────────────────────────
type RoutingTestCase = {
  query: string;
  expectedCategory: ModelCategory;
  description: string;
};

const ROUTING_TESTS: RoutingTestCase[] = [
  { query: 'Write a Python function to sort a list', expectedCategory: 'CODE', description: 'Code generation' },
  { query: 'What is machine learning?', expectedCategory: 'CHAT', description: 'General question' },
  { query: 'Create a story about a robot', expectedCategory: 'CREATIVE', description: 'Creative writing' },
  { query: 'Analyze this complex problem step by step', expectedCategory: 'REASONING', description: 'Reasoning/Analysis' },
  { query: 'Quick test response', expectedCategory: 'FAST', description: 'Speed requirement' },
  { query: 'Describe this image in detail', expectedCategory: 'VISION', description: 'Vision request' },
  { query: 'Translate this to French: Hello world', expectedCategory: 'CHAT', description: 'Translation' },
  { query: 'Debug this code: function add(a,b) { return a - b }', expectedCategory: 'CODE', description: 'Debugging' },
  { query: 'Explain quantum computing like I am 5', expectedCategory: 'CHAT', description: 'Explanation' },
  { query: 'Calculate the probability of rolling two sixes', expectedCategory: 'REASONING', description: 'Math/Probability' },
];

// ─── 4. API CONNECTIVITY TEST (LIGHT) ─────────────────────────────────────
async function testModelConnectivity(model: Model): Promise<{ success: boolean; latency: number; error?: string }> {
  const start = Date.now();
  try {
    const resp = await aiClient.callModel(model, 'Hello, respond with just "OK".');
    return { success: resp.success, latency: Date.now() - start, error: resp.error };
  } catch (e) {
    return { success: false, latency: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── 5. MAIN TEST RUNNER ─────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('   ROUTING VALIDATION — MODEL REACHABILITY TEST');
  console.log('══════════════════════════════════════════════════════\n');

  // ── STEP 1: Scan providers ──
  console.log('── 1. PROVIDER API KEY STATUS ──\n');
  const providerReports = scanProviders();

  const validProviders = providerReports.filter(p => p.hasValidKey);
  const invalidProviders = providerReports.filter(p => !p.hasValidKey);

  for (const p of validProviders) {
    console.log(`  ✅ ${p.provider.padEnd(18)} ${p.envVar.padEnd(25)} → ${p.keyPreview}`);
  }
  console.log('');
  for (const p of invalidProviders) {
    const status = p.reason || 'MISSING';
    console.log(`  ❌ ${p.provider.padEnd(18)} ${p.envVar.padEnd(25)} → ${status}`);
  }

  console.log(`\n  Summary: ${validProviders.length}/${providerReports.length} providers have valid keys\n`);

  // ── STEP 2: Scan models ──
  console.log('── 2. MODEL AVAILABILITY ──\n');
  const modelReports = scanModels(providerReports);

  const availableModels = modelReports.filter(m => m.available);
  const unavailableModels = modelReports.filter(m => !m.available);
  const providerOnlyModels = modelReports.filter(m => !m.available && m.providerHasKey);

  // Show models grouped by provider
  const byProvider = new Map<string, ModelReport[]>();
  for (const mr of modelReports) {
    const list = byProvider.get(mr.model.provider) || [];
    list.push(mr);
    byProvider.set(mr.model.provider, list);
  }

  for (const [provider, reports] of [...byProvider.entries()].sort()) {
    const availCount = reports.filter(r => r.available).length;
    const totalCount = reports.length;
    const hasKey = reports[0]?.providerHasKey ?? false;
    const keyIcon = hasKey ? '🔑' : '🔒';

    if (totalCount > 0) {
      console.log(`  ${keyIcon} ${provider.padEnd(18)} ${availCount}/${totalCount} available`);
    }

    for (const r of reports) {
      const icon = r.available ? '✅' : '❌';
      const reason = r.errors.length > 0 ? ` (${r.errors.join(', ')})` : '';
      console.log(`     ${icon} ${r.model.name} [${r.model.category}]${reason}`);
    }
  }

  console.log(`\n  Summary: ${availableModels.length}/${modelReports.length} models available\n`);

  // ── STEP 3: Routing decisions ──
  console.log('── 3. ROUTING DECISIONS ──\n');

  for (const test of ROUTING_TESTS) {
    const analysis = aiRouter.analyzeQuery(test.query);
    const route = aiRouter.routeQuery(test.query);

    const catMatch = analysis.primaryType === test.expectedCategory ? '✓' : '✗';
    console.log(`  "${test.query.slice(0, 55).padEnd(58)} → ${route.selectedModel.name} [${analysis.primaryType} ${catMatch} ${test.expectedCategory}] confidence:${(route.confidence * 100).toFixed(0)}%`);

    if (route.fallbackChain.length > 0) {
      console.log(`     Fallbacks: ${route.fallbackChain.map(m => m.name).join(' → ')}`);
    }
  }

  // ── STEP 4: Connectivity test (optional, for models with real keys) ──
  console.log('\n── 4. API CONNECTIVITY TEST (sample each provider) ──\n');

  // Pick one model per available provider
  const providersToTest = new Set(availableModels.map(m => m.model.provider));
  const sampleModels = [...providersToTest]
    .map(prov => availableModels.find(m => m.model.provider === prov)!)
    .filter(Boolean);

  console.log(`  Testing 1 model per provider (${sampleModels.length} providers)...\n`);

  for (const mr of sampleModels) {
    process.stdout.write(`  Testing ${mr.model.name.padEnd(35)} (${mr.model.provider.padEnd(15)})... `);
    try {
      const result = await testModelConnectivity(mr.model);
      if (result.success) {
        console.log(`✅ OK (${result.latency}ms)`);
      } else {
        console.log(`❌ FAIL (${result.latency}ms): ${(result.error || '').slice(0, 80)}`);
      }
    } catch (e) {
      console.log(`❌ EXCEPTION: ${String(e).slice(0, 80)}`);
    }
  }

  // ── STEP 5: System test ──
  console.log('\n── 5. SYSTEM SELF-TEST ──\n');
  const sysTest = await aiRouter.testSystem();
  console.log(`  Overall: ${sysTest.success ? '✅ PASS' : '❌ FAIL'}`);
  for (const r of sysTest.results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`  ${icon} "${r.query.slice(0, 50)}" → ${r.model} ${r.error ? `(${r.error})` : ''}`);
  }

  // ── STEP 6: Final summary ──
  console.log('\n══════════════════════════════════════════════════════');
  console.log('   FINAL REPORT');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Providers with valid keys: ${validProviders.length}/${providerReports.length}`);
  console.log(`  Models available:          ${availableModels.length}/${modelReports.length}`);
  console.log(`  Routing test cases:        ${ROUTING_TESTS.length}`);

  const missingProviders = invalidProviders.filter(p => {
    // providers that have models defined but no key
    return ALL_MODELS.some(m => m.provider === p.provider);
  });

  if (missingProviders.length > 0) {
    console.log(`\n  ⚠️  Models defined but provider keys MISSING:`);
    for (const mp of missingProviders) {
      const modelsForProvider = ALL_MODELS.filter(m => m.provider === mp.provider);
      console.log(`     ${mp.provider}: ${modelsForProvider.map(m => m.name).join(', ')}`);
      console.log(`     → Add ${mp.envVar} to .env`);
    }
  }

  // Key providers with unused API keys (having key but no model assigned)
  const unusedKeyProviders = validProviders.filter(p => {
    return !ALL_MODELS.some(m => m.provider === p.provider);
  });

  if (unusedKeyProviders.length > 0) {
    console.log(`\n  ⚠️  API keys exist but NO models assigned:`);
    for (const up of unusedKeyProviders) {
      console.log(`     ${up.provider}: key configured but no model entries in ALL_MODELS`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
