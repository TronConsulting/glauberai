import { NextRequest, NextResponse } from 'next/server';
import { getAuthCookie, verifyJwt } from '@/lib/auth';

// Test endpoints for each provider
const PROVIDER_TESTS = {
  openai: {
    name: 'OpenAI',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  anthropic: {
    name: 'Anthropic',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      return { status: response.status, working: response.status !== 401 };
    }
  },
  google: {
    name: 'Google (Gemini)',
    test: async (apiKey: string) => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return { status: response.status, working: response.ok };
    }
  },
  groq: {
    name: 'Groq',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  together: {
    name: 'Together AI',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.together.xyz/models/info', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  deepinfra: {
    name: 'DeepInfra',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.deepinfra.com/v1/openai/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  huggingface: {
    name: 'HuggingFace',
    test: async (apiKey: string) => {
      const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: 'test' })
      });
      return { status: response.status, working: response.status !== 401 };
    }
  },
  replicate: {
    name: 'Replicate',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.replicate.com/v1/models', {
        headers: { 'Authorization': `Token ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  openrouter: {
    name: 'OpenRouter',
    test: async (apiKey: string) => {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  perplexity: {
    name: 'Perplexity',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });
      return { status: response.status, working: response.status !== 401 };
    }
  },
  cohere: {
    name: 'Cohere',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.cohere.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  mistral: {
    name: 'Mistral',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  fireworks: {
    name: 'Fireworks',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  },
  stability: {
    name: 'Stability AI',
    test: async (apiKey: string) => {
      const response = await fetch('https://api.stability.ai/v1/user/account', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      return { status: response.status, working: response.ok };
    }
  }
};

export async function GET(req: NextRequest) {
  // Check authentication
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const userId = typeof decoded === 'object' && 'id' in decoded ? String(decoded.id) : null;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
  }

  // Get all environment variables
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    groq: process.env.GROQ_API_KEY,
    together: process.env.TOGETHER_API_KEY,
    deepinfra: process.env.DEEPINFRA_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
    replicate: process.env.REPLICATE_API_TOKEN,
    openrouter: process.env.OPENROUTER_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    cohere: process.env.COHERE_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    fireworks: process.env.FIREWORKS_API_KEY,
    stability: process.env.STABILITY_API_KEY,
  };

  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      configured: 0,
      working: 0,
      failed: 0
    },
    providers: {} as Record<string, any>
  };

  // Test each provider
  for (const [provider, config] of Object.entries(PROVIDER_TESTS)) {
    results.summary.total++;
    
    const apiKey = apiKeys[provider as keyof typeof apiKeys];
    
    if (!apiKey || apiKey.trim() === '') {
      results.providers[provider] = {
        name: config.name,
        status: 'not_configured',
        message: 'API key not found in environment variables',
        configured: false,
        working: false
      };
      continue;
    }

    results.summary.configured++;
    
    try {
      console.log(`Testing ${config.name}...`);
      const testResult = await config.test(apiKey);
      
      if (testResult.working) {
        results.summary.working++;
        results.providers[provider] = {
          name: config.name,
          status: 'working',
          message: 'API key is valid and working',
          configured: true,
          working: true,
          httpStatus: testResult.status
        };
      } else {
        results.summary.failed++;
        results.providers[provider] = {
          name: config.name,
          status: 'invalid',
          message: `API key appears invalid (HTTP ${testResult.status})`,
          configured: true,
          working: false,
          httpStatus: testResult.status
        };
      }
    } catch (error) {
      results.summary.failed++;
      results.providers[provider] = {
        name: config.name,
        status: 'error',
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        configured: true,
        working: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Add recommendations
  const recommendations = [];
  
  if (results.summary.working === 0) {
    recommendations.push('No working API keys found. Add at least one to start using AI models.');
  }
  
  if (!results.providers.groq?.working && !results.providers.huggingface?.working) {
    recommendations.push('Consider adding Groq or HuggingFace API keys for free tier access.');
  }
  
  if (!results.providers.deepinfra?.working) {
    recommendations.push('DeepInfra offers very cheap models ($0.08/1M tokens) - consider adding their API key.');
  }
  
  if (results.summary.working > 0) {
    recommendations.push(`Great! You have ${results.summary.working} working provider(s). Your AI queries will work.`);
  }

  return NextResponse.json({
    ...results,
    recommendations
  });
}

export async function POST(req: NextRequest) {
  // Quick single provider test
  const { provider, test_query = 'Hello' } = await req.json();
  
  const token = await getAuthCookie();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const decoded = await verifyJwt(token);
  if (!decoded || typeof decoded === 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (!provider || !PROVIDER_TESTS[provider as keyof typeof PROVIDER_TESTS]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    groq: process.env.GROQ_API_KEY,
    together: process.env.TOGETHER_API_KEY,
    deepinfra: process.env.DEEPINFRA_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
    replicate: process.env.REPLICATE_API_TOKEN,
    openrouter: process.env.OPENROUTER_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    cohere: process.env.COHERE_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    fireworks: process.env.FIREWORKS_API_KEY,
    stability: process.env.STABILITY_API_KEY,
  };

  const apiKey = apiKeys[provider as keyof typeof apiKeys];
  if (!apiKey) {
    return NextResponse.json({ 
      provider,
      status: 'not_configured',
      message: 'API key not found'
    });
  }

  try {
    const config = PROVIDER_TESTS[provider as keyof typeof PROVIDER_TESTS];
    const result = await config.test(apiKey);
    
    return NextResponse.json({
      provider,
      name: config.name,
      status: result.working ? 'working' : 'invalid',
      message: result.working ? 'API key is working' : `Invalid API key (HTTP ${result.status})`,
      httpStatus: result.status
    });
  } catch (error) {
    return NextResponse.json({
      provider,
      status: 'error',
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}