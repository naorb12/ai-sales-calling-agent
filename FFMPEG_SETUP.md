# FFmpeg Setup for Audio Conversion

## Windows Setup

### 1. Find Your ffmpeg Path

Since you installed ffmpeg manually, find where it's located:

```bash
# In Windows Command Prompt (cmd):
where ffmpeg
```

This will show something like:
- `C:\ffmpeg\bin\ffmpeg.exe`
- `C:\Users\user\ffmpeg\bin\ffmpeg.exe`
- Or wherever you extracted it

### 2. Add to .env

Add this line to your `.env` file:

```bash
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
```

**Important**: Use forward slashes `/` even on Windows, or escape backslashes `\\`

### 3. Restart the Dev Server

```bash
npm run dev
```

## Testing

Try the call again:

```bash
npm run test:call
```

You should now hear the agent speaking Hebrew!

---

## Alternative: Add to System PATH (Optional)

If you prefer, add ffmpeg to your system PATH:
1. Search "Environment Variables" in Windows
2. Edit "Path" system variable
3. Add: `C:\ffmpeg\bin` (or wherever your ffmpeg.exe is)
4. Restart Git Bash/terminal

Then you won't need `FFMPEG_PATH` in `.env`.

