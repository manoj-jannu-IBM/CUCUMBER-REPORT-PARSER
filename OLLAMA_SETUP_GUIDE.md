# Ollama Setup Guide - Free Local AI Models

This guide will help you set up Ollama to run AI models locally for free. No API keys, no cloud costs, complete privacy!

## What is Ollama?

Ollama is a free, open-source tool that lets you run large language models (LLMs) locally on your computer. It's perfect for:
- ✅ **100% Free** - No API costs or subscriptions
- ✅ **Privacy** - Your data never leaves your machine
- ✅ **Offline** - Works without internet connection
- ✅ **Fast** - No network latency
- ✅ **Easy** - Simple installation and usage

## System Requirements

### Minimum Requirements:
- **RAM**: 8GB (16GB recommended)
- **Storage**: 10GB free space
- **OS**: Windows 10/11, macOS, or Linux

### Recommended for Best Performance:
- **RAM**: 16GB or more
- **GPU**: NVIDIA GPU with 6GB+ VRAM (optional but faster)
- **Storage**: SSD with 20GB+ free space

## Step 1: Install Ollama

### Windows:
1. Download Ollama from: https://ollama.com/download/windows
2. Run the installer (`OllamaSetup.exe`)
3. Follow the installation wizard
4. Ollama will start automatically

### macOS:
1. Download Ollama from: https://ollama.com/download/mac
2. Open the downloaded `.dmg` file
3. Drag Ollama to Applications folder
4. Launch Ollama from Applications

### Linux:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## Step 2: Verify Installation

Open a terminal/command prompt and run:
```bash
ollama --version
```

You should see the version number (e.g., `ollama version 0.1.x`)

## Step 3: Download AI Models

Ollama supports many models. Here are the recommended ones for test analysis:

### Recommended Models:

#### 1. **Llama 3.2** (Recommended - Best Balance)
```bash
ollama pull llama3.2
```
- Size: ~2GB
- RAM needed: 8GB
- Speed: Fast
- Quality: Excellent

#### 2. **Llama 3.2:1b** (Fastest - Low Resource)
```bash
ollama pull llama3.2:1b
```
- Size: ~1.3GB
- RAM needed: 4GB
- Speed: Very Fast
- Quality: Good

#### 3. **Llama 3.1:8b** (Better Quality)
```bash
ollama pull llama3.1:8b
```
- Size: ~4.7GB
- RAM needed: 16GB
- Speed: Medium
- Quality: Excellent

#### 4. **Mistral** (Alternative)
```bash
ollama pull mistral
```
- Size: ~4.1GB
- RAM needed: 8GB
- Speed: Fast
- Quality: Very Good

#### 5. **Phi-3** (Microsoft - Efficient)
```bash
ollama pull phi3
```
- Size: ~2.3GB
- RAM needed: 8GB
- Speed: Fast
- Quality: Good

### Check Downloaded Models:
```bash
ollama list
```

## Step 4: Test Ollama

Test if Ollama is working:
```bash
ollama run llama3.2
```

Type a question like "What is test automation?" and press Enter. If you get a response, it's working!

Type `/bye` to exit.

## Step 5: Configure Your Application

Update your `.env` file:

```env
# Ollama Configuration (Local & Free)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Available Model Options:
- `llama3.2` - Recommended (2GB)
- `llama3.2:1b` - Fastest (1.3GB)
- `llama3.1:8b` - Best quality (4.7GB)
- `mistral` - Alternative (4.1GB)
- `phi3` - Microsoft model (2.3GB)

## Step 6: Start Your Application

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The application will now use Ollama for AI analysis!

## Troubleshooting

### Issue: "Connection refused" or "Cannot connect to Ollama"

**Solution:**
1. Check if Ollama is running:
   ```bash
   ollama list
   ```
2. If not running, start it:
   - **Windows**: Launch Ollama from Start Menu
   - **macOS**: Launch from Applications
   - **Linux**: `systemctl start ollama`

### Issue: "Model not found"

**Solution:**
Download the model first:
```bash
ollama pull llama3.2
```

### Issue: "Out of memory" or slow performance

**Solutions:**
1. Use a smaller model:
   ```bash
   ollama pull llama3.2:1b
   ```
   Update `.env`: `OLLAMA_MODEL=llama3.2:1b`

2. Close other applications to free up RAM

3. Restart Ollama:
   ```bash
   ollama stop
   ollama serve
   ```

### Issue: Model responses are slow

**Solutions:**
1. Use a smaller/faster model (llama3.2:1b)
2. If you have an NVIDIA GPU, Ollama will automatically use it
3. Increase system RAM if possible
4. Use an SSD instead of HDD

### Issue: "Port 11434 already in use"

**Solution:**
Another instance of Ollama is running. Kill it:
- **Windows**: Task Manager → End "Ollama" process
- **macOS/Linux**: `killall ollama`

Then restart Ollama.

## Performance Tips

### 1. Choose the Right Model
- **Low RAM (8GB)**: Use `llama3.2:1b` or `phi3`
- **Medium RAM (16GB)**: Use `llama3.2` or `mistral`
- **High RAM (32GB+)**: Use `llama3.1:8b` or larger models

### 2. GPU Acceleration
If you have an NVIDIA GPU:
- Ollama automatically uses it
- Much faster than CPU-only
- Check GPU usage: `nvidia-smi` (Linux/Windows)

### 3. Optimize Settings
In your code, you can adjust:
```javascript
options: {
  temperature: 0.3,  // Lower = more focused (0.0-1.0)
  num_predict: 1000, // Max tokens to generate
}
```

### 4. Keep Models Updated
```bash
ollama pull llama3.2  # Updates to latest version
```

## Advanced Usage

### Run Ollama as a Service (Linux)
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Custom Model Parameters
```bash
ollama run llama3.2 --temperature 0.3 --num-predict 500
```

### View Model Information
```bash
ollama show llama3.2
```

### Remove Unused Models
```bash
ollama rm mistral
```

## Comparing Models

| Model | Size | RAM | Speed | Quality | Best For |
|-------|------|-----|-------|---------|----------|
| llama3.2:1b | 1.3GB | 4GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | Low-end systems |
| llama3.2 | 2GB | 8GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | **Recommended** |
| phi3 | 2.3GB | 8GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Balanced |
| mistral | 4.1GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Good alternative |
| llama3.1:8b | 4.7GB | 16GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Best quality |

## Cost Comparison

### Ollama (Local):
- **Setup**: Free
- **Usage**: Free
- **Monthly**: $0
- **Privacy**: 100% private
- **Internet**: Not required

### OpenAI:
- **Setup**: Free
- **Usage**: $0.03 per 1K tokens
- **Monthly**: ~$50-200
- **Privacy**: Data sent to OpenAI
- **Internet**: Required

### IBM Watson:
- **Setup**: Free
- **Usage**: Free tier (20 hours/month)
- **Monthly**: $0-100+
- **Privacy**: Data sent to IBM
- **Internet**: Required

## Additional Resources

- **Ollama Website**: https://ollama.com
- **Model Library**: https://ollama.com/library
- **GitHub**: https://github.com/ollama/ollama
- **Discord Community**: https://discord.gg/ollama
- **Documentation**: https://github.com/ollama/ollama/tree/main/docs

## FAQ

**Q: Is Ollama really free?**
A: Yes! 100% free and open-source. No hidden costs.

**Q: Can I use it commercially?**
A: Yes, most models (like Llama) have permissive licenses.

**Q: Does it work offline?**
A: Yes! Once models are downloaded, no internet needed.

**Q: How much does it cost to run?**
A: Only your electricity costs. No API fees.

**Q: Is it as good as ChatGPT?**
A: Smaller models are less capable, but llama3.1:8b is very good for most tasks.

**Q: Can I run multiple models?**
A: Yes! Download as many as you want and switch between them.

**Q: Will it slow down my computer?**
A: It uses RAM and CPU/GPU when running. Close it when not needed.

---

**Need Help?** Open an issue or check the Ollama documentation!