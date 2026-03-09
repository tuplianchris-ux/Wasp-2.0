"""
OpenRouter AI Integration Utility

This module provides a unified interface for calling various AI models through OpenRouter,
offering cheaper and more flexible access to multiple AI providers.

Supported models:
- anthropic/claude-3-haiku (cheapest, fast)
- anthropic/claude-3.5-sonnet (complex tasks)
- openai/gpt-4o-mini
- openai/gpt-4o
- google/gemini-flash-1.5
- And many more via OpenRouter
"""

import os
import httpx
import json
import logging
from typing import Optional, Dict, Any
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

# OpenRouter configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

# Default models for different use cases
DEFAULT_MODELS = {
    "fast": "anthropic/claude-3-haiku",
    "balanced": "anthropic/claude-3.5-sonnet",
    "complex": "anthropic/claude-3.5-sonnet",
    "image": "anthropic/claude-3.5-sonnet"
}

async def call_openrouter(
    prompt: str,
    model: str = None,
    system: str = None,
    temperature: float = 0.7,
    max_tokens: int = 4000,
    use_case: str = "balanced",
    timeout: int = 60,
    max_retries: int = 3
) -> str:
    """
    Call OpenRouter API with the given prompt and model.
    
    Args:
        prompt: The main prompt/message to send
        model: Specific model to use (optional, will use default based on use_case)
        system: System message (optional)
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens in response
        use_case: Type of task ("fast", "balanced", "complex", "image")
        timeout: Request timeout in seconds
        max_retries: Maximum retry attempts
    
    Returns:
        str: The AI response text
        
    Raises:
        Exception: If the API call fails after retries
    """
    
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY environment variable is required")
    
    # Use default model if not specified
    if not model:
        model = DEFAULT_MODELS.get(use_case, DEFAULT_MODELS["balanced"])
    
    # Prepare messages
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    # Prepare request payload
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://visionary-academy.com",  # Optional: your app URL
        "X-Title": "Visionary Academy"  # Optional: your app name
    }
    
    # Retry logic
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                logger.info(f"OpenRouter API call (attempt {attempt + 1}/{max_retries + 1}): model={model}")
                
                response = await client.post(
                    OPENROUTER_BASE_URL,
                    headers=headers,
                    json=payload
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0]["message"]["content"]
                        logger.info(f"OpenRouter response successful: {len(content)} chars")
                        return content
                    else:
                        raise ValueError(f"Invalid response format: {data}")
                
                elif response.status_code == 429:
                    # Rate limited, wait and retry
                    retry_after = int(response.headers.get("Retry-After", 5))
                    logger.warning(f"Rate limited, waiting {retry_after}s before retry")
                    if attempt < max_retries:
                        await asyncio.sleep(retry_after)
                        continue
                
                elif response.status_code >= 500:
                    # Server error, retry
                    logger.warning(f"Server error {response.status_code}, retrying...")
                    if attempt < max_retries:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                
                # Client error (4xx) or other issues
                error_text = response.text
                logger.error(f"OpenRouter API error {response.status_code}: {error_text}")
                raise Exception(f"OpenRouter API error {response.status_code}: {error_text}")
                
        except httpx.TimeoutException:
            last_exception = "Request timeout"
            logger.warning(f"Request timeout (attempt {attempt + 1})")
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)
                continue
                
        except Exception as e:
            last_exception = str(e)
            logger.error(f"Request failed (attempt {attempt + 1}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)
                continue
    
    # All retries failed
    raise Exception(f"OpenRouter API call failed after {max_retries + 1} attempts. Last error: {last_exception}")

async def call_openrouter_with_image(
    prompt: str,
    image_base64: str,
    model: str = None,
    system: str = None,
    temperature: float = 0.7,
    max_tokens: int = 4000,
    timeout: int = 120
) -> str:
    """
    Call OpenRouter API with image input.
    
    Args:
        prompt: Text prompt describing what to do with the image
        image_base64: Base64-encoded image data
        model: Model to use (defaults to vision-capable model)
        system: System message (optional)
        temperature: Sampling temperature
        max_tokens: Maximum tokens in response
        timeout: Request timeout in seconds
    
    Returns:
        str: The AI response text
    """
    
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY environment variable is required")
    
    # Use vision-capable model if not specified
    if not model:
        model = DEFAULT_MODELS["image"]
    
    # Prepare messages with image
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    
    messages.append({
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_base64}"
                }
            }
        ]
    })
    
    # Prepare request payload
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://visionary-academy.com",
        "X-Title": "Visionary Academy"
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            logger.info(f"OpenRouter vision API call: model={model}")
            
            response = await client.post(
                OPENROUTER_BASE_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    logger.info(f"OpenRouter vision response successful: {len(content)} chars")
                    return content
                else:
                    raise ValueError(f"Invalid response format: {data}")
            else:
                error_text = response.text
                logger.error(f"OpenRouter vision API error {response.status_code}: {error_text}")
                raise Exception(f"OpenRouter vision API error {response.status_code}: {error_text}")
                
    except Exception as e:
        logger.error(f"OpenRouter vision call failed: {e}")
        raise

def get_available_models() -> Dict[str, str]:
    """
    Get a dictionary of recommended models for different use cases.
    
    Returns:
        Dict mapping use cases to model names
    """
    return DEFAULT_MODELS.copy()

def validate_api_key() -> bool:
    """
    Check if OpenRouter API key is properly configured.
    
    Returns:
        bool: True if API key is available
    """
    return bool(OPENROUTER_API_KEY and len(OPENROUTER_API_KEY) > 10)
