# GlauberAI - Production-Ready Multi-Modal AI Platform

A sophisticated AI query platform with intelligent routing, supporting **text, image generation, audio processing, and embeddings**. Features multi-provider integration, real-time analytics, and Stripe-powered subscriptions.

## ✨ Features

### AI Capabilities
| Mode | Models | Description |
|------|--------|-------------|
| **💬 Chat & Reasoning** | GPT-4o, Claude 3.5, Gemini 1.5 | Conversational AI, complex reasoning |
| **💻 Code** | Code Llama, StarCoder, GPT-4o | Code generation, debugging, reviews |
| **🎨 Image Generation** | DALL-E 3, Stable Diffusion XL | Text-to-image, editing, variations |
| **🎤 Speech-to-Text** | Whisper | Audio transcription, translation |
| **🔊 Text-to-Speech** | TTS-1, ElevenLabs | Natural voice synthesis |
| **🔢 Embeddings** | text-embedding-3 | Semantic search, RAG applications |

### Platform Features
- **Intelligent Routing**: Auto-selects best model based on query, complexity, and files
- **Multi-Provider**: OpenAI, Anthropic, Google, Groq, HuggingFace, Stability AI, ElevenLabs
- **File Support**: Images, documents, audio, video with secure storage
- **Usage Analytics**: Track requests, costs, and model performance
- **Subscriptions**: Stripe billing with tiered plans (Starter, Professional, Enterprise)
- **Authentication**: JWT-based with HTTP-only cookies

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Required
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Providers (add keys for providers you want to use)
OPENAI_API_KEY="sk-..."          # Enables: GPT-4, DALL-E, Whisper, TTS, Embeddings
ANTHROPIC_API_KEY="sk-ant-..."   # Enables: Claude 3.5 Sonnet, Claude 3 Haiku
GOOGLE_API_KEY="..."             # Enables: Gemini 1.5 Pro/Flash
GROQ_API_KEY="gsk_..."           # Enables: Ultra-fast Llama 3, Mixtral
HUGGINGFACE_API_KEY="hf_..."     # Enables: Free open-source models
STABILITY_API_KEY="sk-..."       # Enables: Stable Diffusion XL
ELEVENLABS_API_KEY="..."         # Enables: Premium TTS voices

# Stripe (optional, for billing)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── query/              # Main AI query endpoint
│   │   ├── generate/image/     # Image generation
│   │   ├── audio/transcribe/   # Speech-to-text
│   │   ├── audio/speech/       # Text-to-speech
│   │   ├── embeddings/         # Text embeddings
│   │   └── admin/              # System management
│   └── dashboard/              # User interface
├── lib/
│   ├── models.ts               # AI model definitions (29 models)
│   ├── ai-router.ts            # Intelligent routing logic
│   ├── ai-client.ts            # Provider API clients
│   ├── ai-modes.ts             # Mode detection & configuration
│   └── generators/             # Specialized AI services
│       ├── image-generator.ts
│       ├── audio-processor.ts
│       └── embedding-generator.ts
└── prisma/
    └── schema.prisma           # Database schema
```

## 🔌 API Endpoints

### Query Endpoint
```bash
POST /api/query
# Intelligent routing to best model based on content
```

### Image Generation
```bash
POST /api/generate/image
{
  "prompt": "A futuristic cityscape",
  "size": "1024x1024",
  "quality": "hd",
  "provider": "openai"
}
```

### Speech-to-Text
```bash
POST /api/audio/transcribe
# Form data with audio file
```

### Text-to-Speech
```bash
POST /api/audio/speech
{
  "text": "Hello world",
  "voice": "nova",
  "model": "tts-1"
}
```

### Embeddings
```bash
POST /api/embeddings
{
  "texts": ["Hello", "World"],
  "model": "text-embedding-3-small"
}
```

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT with HTTP-only cookies |
| Payments | Stripe |
| AI | OpenAI, Anthropic, Google, Groq, HuggingFace, Stability AI |

## 📊 Subscription Plans

| Plan | Requests | Price | Features |
|------|----------|-------|----------|
| **Starter** | 100K tokens/mo | Free | Basic models, 10MB uploads |
| **Professional** | 1M tokens/mo | $29/mo | All models, 50MB uploads, priority |
| **Enterprise** | Unlimited | $99/mo | Custom models, API access, support |

## 🔒 Security

- JWT tokens with HTTP-only cookies
- Rate limiting per user tier
- Input validation on all endpoints
- Secure file upload handling
- Environment-based API key management

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using Next.js and modern AI APIs
