# OpenRouter Integration Setup Guide

This guide explains how to set up and use the new OpenRouter integration for cheaper, more flexible AI access.

## 🚀 Quick Setup

### 1. Get OpenRouter API Key

1. Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Create an account (free)
3. Generate a new API key
4. Copy the key (starts with `sk-or-v1-`)

### 2. Configure Environment

Add to your `.env` file:

```env
# OpenRouter API Key (Required)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key-here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### 3. Test the Integration

```bash
# Restart the backend
cd backend
python server.py

# Test with curl
curl -X POST "http://localhost:8000/api/ai/summarize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"content": "The quick brown fox jumps over the lazy dog.", "style": "concise"}'
```

## 💰 Cost Comparison

| Model | Provider | Cost (1M tokens) | Use Case |
|-------|----------|------------------|----------|
| Claude 3 Haiku | OpenRouter | $0.25 | Fast tasks, summaries |
| Claude 3.5 Sonnet | OpenRouter | $3.00 | Complex analysis, chat |
| GPT-4o Mini | OpenRouter | $0.15 | General tasks |

**Great cost-efficiency with OpenRouter!**

## 🎯 Model Usage Guide

### Fast & Cheap (Claude 3 Haiku)
- **Endpoints**: `/ai/summarize`, `/ai/quiz`, `/ai/flashcards`, `/templates/generate`
- **Cost**: $0.25/1M tokens
- **Speed**: Very fast
- **Best for**: Simple tasks, high volume

### Complex & Capable (Claude 3.5 Sonnet)
- **Endpoints**: `/ai/visionary/chat`, `/ai/analyze-image`, writing improvement
- **Cost**: $3.00/1M tokens  
- **Speed**: Fast
- **Best for**: Complex reasoning, detailed analysis

### Budget Alternative (GPT-4o Mini)
- **Available**: Can be used for any endpoint
- **Cost**: $0.15/1M tokens
- **Speed**: Fast
- **Best for**: Cost-sensitive operations

## 🔧 Technical Details

### OpenRouter Utility Functions

```python
from utils.openrouter import call_openrouter, call_openrouter_with_image

# Text generation
response = await call_openrouter(
    prompt="Summarize this text...",
    model="anthropic/claude-3-haiku",
    system="You are a helpful assistant.",
    use_case="fast"
)

# Image analysis
response = await call_openrouter_with_image(
    prompt="What's in this image?",
    image_base64="base64-encoded-image-data",
    model="anthropic/claude-3.5-sonnet"
)
```

### Features

- ✅ **Automatic retry logic** (3 attempts with exponential backoff)
- ✅ **Rate limit handling** (respects 429 responses)
- ✅ **Error handling** (graceful fallbacks)
- ✅ **Timeout protection** (configurable timeouts)
- ✅ **Model selection** (smart defaults based on use case)
- ✅ **Logging** (detailed request/response logging)

### Available Models

```python
from utils.openrouter import get_available_models

models = get_available_models()
print(models)
# Output:
# {
#     "fast": "anthropic/claude-3-haiku",
#     "balanced": "anthropic/claude-3.5-sonnet", 
#     "complex": "anthropic/claude-3.5-sonnet",
#     "image": "anthropic/claude-3.5-sonnet"
# }
```

## 🛠️ Troubleshooting

### Common Issues

1. **"OPENROUTER_API_KEY not found"**
   - Add the key to your `.env` file
   - Restart the backend server

2. **"Invalid API key"**
   - Check the key format (should start with `sk-or-v1-`)
   - Verify the key is active on OpenRouter

3. **"Rate limit exceeded"**
   - OpenRouter has generous limits, but consider upgrading
   - Built-in retry logic handles most cases

4. **"Model not available"**
   - OpenRouter provides fallback models automatically
   - Check OpenRouter status page for outages

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📊 Monitoring

OpenRouter provides usage analytics at:
- [https://openrouter.ai/usage](https://openrouter.ai/usage)

Track:
- Token usage by model
- Cost breakdown
- Request success rates
- Response times

## 🔐 Security

- API keys are stored in environment variables
- Requests include proper referer headers
- Content Security Policy headers configured
- Input sanitization and validation in place

## 🚀 Next Steps

1. **Monitor costs** - Check OpenRouter dashboard regularly
2. **Optimize models** - Switch between models based on task complexity
3. **Add more endpoints** - Use OpenRouter for new AI features
4. **Fine-tune prompts** - Optimize for each model's strengths

## 📞 Support

- **OpenRouter Docs**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **Model List**: [https://openrouter.ai/models](https://openrouter.ai/models)
- **Pricing**: [https://openrouter.ai/pricing](https://openrouter.ai/pricing)

---

**Enjoy up to 95% cost savings with better performance! 🎉**
